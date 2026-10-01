-- Lab mode. Apply once in the Supabase SQL Editor, after 001_autolab.sql.
--
-- In lab mode the Pi never talks to Supabase. A computer in the lab (the
-- station) runs the gateway, reaches the Pi over the local network and writes
-- to Supabase as the person signed in there. Row level security limits every
-- write to that person's own rows, so no secret key is needed anywhere: the
-- web app only ever holds the public anon key.
--
-- Use one Supabase project per setup: lab mode or the hosted gateway of cloud
-- mode, not both. Lab mode lets signed in people add their own Autolabs, which
-- the hosted gateway's claim codes don't expect.

-- Profiles: one per account, made automatically at sign up.
create table public.profiles (
 id uuid primary key references auth.users on delete cascade,
 display_name text check (display_name is null or length(display_name) between 1 and 80),
 created_at timestamptz not null default now()
);
create function public.create_profile() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 insert into public.profiles(id,display_name)
 values (new.id, nullif(left(split_part(coalesce(new.email,''),'@',1),80),''))
 on conflict (id) do nothing;
 return new;
end $$;
revoke all on function public.create_profile() from public,anon,authenticated;
create trigger create_profile after insert on auth.users for each row execute function public.create_profile();
-- People who signed up before this migration get a profile too.
insert into public.profiles(id,display_name)
select id, nullif(left(split_part(coalesce(email,''),'@',1),80),'') from auth.users on conflict (id) do nothing;

-- Autolabs: the station adds them for the signed in owner, then keeps their status fresh.
alter table public.devices add column if not exists simulated boolean not null default false;
alter table public.devices add column if not exists agent_version text check (agent_version is null or length(agent_version)<=40);
alter table public.devices alter column owner_id set default auth.uid();

-- Photos: computer camera shots and uploads have no Autolab behind them.
alter table public.images alter column device_id drop not null;
alter table public.images add column if not exists bytes integer check (bytes is null or bytes>=0);
alter table public.images add constraint images_source check (source in ('camera','pi','simulator','computer','upload'));
alter table public.images alter column owner_id set default auth.uid();

-- The action log: every command sent to an Autolab, from the station or from
-- any other device. A remote command starts as pending; the station picks it
-- up, runs it over the WebSocket and records how it ended.
create table public.actions (
 id uuid primary key default gen_random_uuid(),
 device_id uuid references public.devices on delete cascade,
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 kind text not null check (kind in ('capture_photo','start_preview','stop_preview','analyze_image')),
 origin text not null check (origin in ('station','remote')),
 status text not null default 'pending' check (status in ('pending','running','done','failed','expired')),
 payload jsonb not null default '{}',
 result jsonb,
 error text check (error is null or length(error)<=500),
 image_id uuid references public.images on delete set null,
 created_at timestamptz not null default now(),
 started_at timestamptz,
 completed_at timestamptz
);
create index actions_device_time on public.actions(device_id, created_at desc);
create index actions_pending on public.actions(device_id) where status='pending';
alter table public.actions enable row level security;
alter table public.profiles enable row level security;

-- What a signed in person may change. Everything else stays read only or hidden.
revoke all on public.profiles, public.actions from anon, authenticated;
grant select on public.profiles, public.actions to authenticated;
grant update (display_name) on public.profiles to authenticated;
grant insert, delete on public.devices to authenticated;
grant update (name, status, camera_online, last_seen_at, simulated, agent_version) on public.devices to authenticated;
grant insert, delete on public.images to authenticated;
grant update (analysis_status) on public.images to authenticated;
grant insert, delete on public.image_analysis to authenticated;
grant insert on public.actions to authenticated;
grant update (status, result, error, image_id, started_at, completed_at) on public.actions to authenticated;
grant all on public.profiles, public.actions to service_role;

create policy own_profile on public.profiles for select to authenticated using (id=(select auth.uid()));
create policy edit_own_profile on public.profiles for update to authenticated using (id=(select auth.uid())) with check (id=(select auth.uid()));

-- A device id can only be taken once. Someone else's Autolab is invisible, so inserting it fails on the key.
create policy add_own_devices on public.devices for insert to authenticated with check (owner_id=(select auth.uid()));
create policy edit_own_devices on public.devices for update to authenticated using (owner_id=(select auth.uid())) with check (owner_id=(select auth.uid()));
create policy remove_own_devices on public.devices for delete to authenticated using (owner_id=(select auth.uid()));

-- A photo must sit in the owner's storage folder and, if it came from an Autolab, one they own.
create policy add_own_images on public.images for insert to authenticated with check (
 owner_id=(select auth.uid())
 and split_part(storage_path,'/',1)=(select auth.uid())::text
 and (device_id is null or exists(select 1 from public.devices d where d.id=device_id and d.owner_id=(select auth.uid())))
);
create policy edit_own_images on public.images for update to authenticated using (owner_id=(select auth.uid())) with check (owner_id=(select auth.uid()));
create policy remove_own_images on public.images for delete to authenticated using (owner_id=(select auth.uid()));
create policy add_own_analysis on public.image_analysis for insert to authenticated with check (
 exists(select 1 from public.images i where i.id=image_id and i.owner_id=(select auth.uid()))
);
create policy remove_own_analysis on public.image_analysis for delete to authenticated using (
 exists(select 1 from public.images i where i.id=image_id and i.owner_id=(select auth.uid()))
);

-- Actions: anyone signed in sends commands only to their own Autolabs, and the log can't be deleted.
create policy own_actions on public.actions for select to authenticated using (user_id=(select auth.uid()));
create policy add_own_actions on public.actions for insert to authenticated with check (
 user_id=(select auth.uid())
 and (device_id is null or exists(select 1 from public.devices d where d.id=device_id and d.owner_id=(select auth.uid())))
);
create policy edit_own_actions on public.actions for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));

-- Storage: each person writes only inside their own top folder, which 001 already lets them read.
create policy add_own_autolab_objects on storage.objects for insert to authenticated
 with check (bucket_id='autolab-images' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy remove_own_autolab_objects on storage.objects for delete to authenticated
 using (bucket_id='autolab-images' and (storage.foldername(name))[1]=(select auth.uid())::text);

-- Realtime: the station hears new commands, and every open screen hears new photos, results and status.
do $$
begin
 if exists (select 1 from pg_publication where pubname='supabase_realtime') then
  alter publication supabase_realtime add table public.actions, public.images, public.image_analysis, public.devices;
 end if;
end $$;
