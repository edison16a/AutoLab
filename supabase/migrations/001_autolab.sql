-- Apply once in Supabase SQL Editor before enabling cloud mode.
create extension if not exists pgcrypto;
create table public.devices (
 id uuid primary key, owner_id uuid references auth.users on delete cascade,
 name text not null default 'My Autolab' check(length(name) between 1 and 80),
 status text not null default 'offline', camera_online boolean not null default false,
 last_seen_at timestamptz, created_at timestamptz not null default now(), claimed_at timestamptz
);
create table public.device_credentials (
 device_id uuid primary key references public.devices on delete cascade,
 secret_hash text not null, created_at timestamptz not null default now(), revoked_at timestamptz
);
create table public.device_claims (
 device_id uuid primary key references public.devices on delete cascade,
 claim_code_hash text not null unique, expires_at timestamptz not null, used_at timestamptz
);
create table public.images (
 id uuid primary key, device_id uuid not null references public.devices on delete cascade,
 owner_id uuid not null references auth.users on delete cascade, storage_path text not null unique,
 captured_at timestamptz not null default now(), width integer not null, height integer not null,
 source text not null default 'camera', analysis_status text not null default 'pending'
);
create table public.image_analysis (
 id uuid primary key default gen_random_uuid(), image_id uuid not null references public.images on delete cascade,
 model_name text not null, result_json jsonb not null, overlay_storage_path text,
 created_at timestamptz not null default now()
);
create table public.commands (
 id uuid primary key, device_id uuid not null references public.devices on delete cascade,
 user_id uuid not null references auth.users on delete cascade, command text not null,
 payload jsonb not null default '{}', status text not null default 'pending',
 created_at timestamptz not null default now(), completed_at timestamptz, error text
);
create index devices_owner on public.devices(owner_id);
create index images_device_time on public.images(device_id,captured_at desc);
create index analysis_image on public.image_analysis(image_id);
create index commands_owner on public.commands(user_id);
alter table public.devices enable row level security;
alter table public.device_credentials enable row level security;
alter table public.device_claims enable row level security;
alter table public.images enable row level security;
alter table public.image_analysis enable row level security;
alter table public.commands enable row level security;
-- Browser access is read-only. Writes go through the ownership-checking gateway.
revoke all on public.device_credentials, public.device_claims from anon, authenticated;
revoke all on public.devices, public.images, public.image_analysis, public.commands from anon, authenticated;
grant select on public.devices, public.images, public.image_analysis, public.commands to authenticated;
grant all on public.devices, public.device_credentials, public.device_claims, public.images, public.image_analysis, public.commands to service_role;
create policy own_devices on public.devices for select to authenticated using (owner_id=(select auth.uid()));
create policy own_images on public.images for select to authenticated using (owner_id=(select auth.uid()));
create policy own_analysis on public.image_analysis for select to authenticated using (exists(select 1 from public.images where images.id=image_id and images.owner_id=(select auth.uid())));
create policy own_commands on public.commands for select to authenticated using (user_id=(select auth.uid()));
-- Atomic, one-use claim. Callable only by the trusted gateway.
create function public.claim_device(code_hash text,new_owner uuid,device_name text) returns uuid
language plpgsql security definer set search_path=public as $$
declare target uuid;
begin
 select device_id into target from device_claims where claim_code_hash=code_hash and used_at is null and expires_at>now() for update;
 if target is null then return null; end if;
 update devices set owner_id=new_owner,name=device_name,claimed_at=now() where id=target and owner_id is null;
 if not found then return null; end if;
 update device_claims set used_at=now() where device_id=target;
 return target;
end $$;
revoke all on function public.claim_device(text,uuid,text) from public,anon,authenticated;
grant execute on function public.claim_device(text,uuid,text) to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('autolab-images','autolab-images',false,16777216,array['image/jpeg']) on conflict(id) do nothing;
create policy own_autolab_objects on storage.objects for select to authenticated
 using(bucket_id='autolab-images' and (storage.foldername(name))[1]=(select auth.uid())::text);
