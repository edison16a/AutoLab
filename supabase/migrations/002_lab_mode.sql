-- Lab mode. Apply once in the Supabase SQL Editor, after 001_autolab.sql.
--
-- In lab mode the Pi talks to Supabase itself. During Bluetooth setup it signs
-- in as an anonymous user, and the person setting it up links that login to
-- their Autolab. From then on the Pi may read and write that one Autolab's
-- rows and nothing else. People sign in with email and password and only ever
-- see their own rows. No secret key is used anywhere: the web app and the Pi
-- hold only the public anon key, and row level security does the rest.
--
-- Use one Supabase project per setup: lab mode or the hosted gateway of cloud
-- mode, not both. Cloud mode keeps every write behind its gateway.

-- People sign in with an email. Pi logins are anonymous, and may never act as a person.
create function public.is_person() returns boolean
language sql stable set search_path='' as $$
 select coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false
$$;

-- Profiles: one per person, made automatically at sign up.
create table public.profiles (
 id uuid primary key references auth.users on delete cascade,
 display_name text check (display_name is null or length(display_name) between 1 and 80),
 created_at timestamptz not null default now()
);
create function public.create_profile() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 if coalesce(new.is_anonymous, false) then return new; end if;
 insert into public.profiles(id,display_name)
 values (new.id, nullif(left(split_part(coalesce(new.email,''),'@',1),80),''))
 on conflict (id) do nothing;
 return new;
end $$;
revoke all on function public.create_profile() from public,anon,authenticated;
create trigger create_profile after insert on auth.users for each row execute function public.create_profile();
-- People who signed up before this migration get a profile too.
insert into public.profiles(id,display_name)
select id, nullif(left(split_part(coalesce(email,''),'@',1),80),'') from auth.users
where not coalesce(is_anonymous, false) on conflict (id) do nothing;

-- Autolabs: a person adds one and links its Pi's login. The Pi then reports its status here.
alter table public.devices add column if not exists simulated boolean not null default false;
alter table public.devices add column if not exists agent_version text check (agent_version is null or length(agent_version)<=40);
alter table public.devices add column if not exists agent_id uuid references auth.users on delete set null;
alter table public.devices alter column owner_id set default auth.uid();
-- One Pi login drives one Autolab.
create unique index devices_agent on public.devices(agent_id) where agent_id is not null;

-- The Pi may report status but never rename or relink its Autolab. Its last
-- seen time comes from the database, so a Pi with a wrong clock can't look
-- online or offline by mistake.
create function public.guard_device() returns trigger
language plpgsql set search_path='' as $$
begin
 if auth.uid() is not null and auth.uid() = old.agent_id and auth.uid() is distinct from old.owner_id then
  if new.name is distinct from old.name or new.agent_id is distinct from old.agent_id then
   raise exception 'Only the owner can rename or relink an Autolab';
  end if;
  new.last_seen_at := now();
 end if;
 return new;
end $$;
create trigger guard_device before update on public.devices for each row execute function public.guard_device();

-- Photos: computer camera shots and uploads have no Autolab behind them.
alter table public.images alter column device_id drop not null;
alter table public.images add column if not exists bytes integer check (bytes is null or bytes>=0);
alter table public.images add constraint images_source check (source in ('camera','pi','simulator','computer','upload'));
alter table public.images alter column owner_id set default auth.uid();

-- The action log: every command sent to an Autolab from any screen. It starts
-- as pending, the Pi claims it, runs it and records how it ended.
create table public.actions (
 id uuid primary key default gen_random_uuid(),
 device_id uuid references public.devices on delete cascade,
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 kind text not null check (kind in ('capture_photo','start_preview','stop_preview','analyze_image')),
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

-- The database keeps the times, so a wrong clock can't skew the log, and an
-- entry that has ended can't be changed.
create function public.stamp_action() returns trigger
language plpgsql set search_path=public as $$
begin
 if tg_op='INSERT' then
  new.created_at := now();
  new.started_at := case when new.status='pending' then null else now() end;
  new.completed_at := case when new.status in ('done','failed','expired') then now() end;
  return new;
 end if;
 if old.status in ('done','failed','expired') then
  -- Deleting a photo clears its link. Nothing else about an ended entry changes.
  if new.image_id is null and to_jsonb(new)-'image_id' = to_jsonb(old)-'image_id' then
   return new;
  end if;
  raise exception 'This command already ended';
 end if;
 new.created_at := old.created_at;
 new.started_at := case when new.status='running' and old.status='pending' then now() else old.started_at end;
 new.completed_at := case when new.status in ('done','failed','expired') then now() end;
 return new;
end $$;
create trigger stamp_action before insert or update on public.actions for each row execute function public.stamp_action();
alter table public.actions enable row level security;
alter table public.profiles enable row level security;

-- What a signed in person or Pi may change. Everything else stays read only or hidden.
revoke all on public.profiles, public.actions from anon, authenticated;
grant select on public.profiles, public.actions to authenticated;
grant update (display_name) on public.profiles to authenticated;
grant insert, delete on public.devices to authenticated;
grant update (name, status, camera_online, last_seen_at, simulated, agent_version, agent_id) on public.devices to authenticated;
grant insert, delete on public.images to authenticated;
grant update (analysis_status) on public.images to authenticated;
grant insert, delete on public.image_analysis to authenticated;
grant insert on public.actions to authenticated;
grant update (status, result, error, image_id) on public.actions to authenticated;
grant all on public.profiles, public.actions to service_role;
grant execute on function public.is_person() to authenticated;

create policy own_profile on public.profiles for select to authenticated using (id=(select auth.uid()));
create policy edit_own_profile on public.profiles for update to authenticated using (id=(select auth.uid())) with check (id=(select auth.uid()));

-- A device id can only be taken once. Someone else's Autolab is invisible, so inserting it fails on the key.
create policy add_own_devices on public.devices for insert to authenticated
 with check (owner_id=(select auth.uid()) and (select public.is_person()));
create policy edit_own_devices on public.devices for update to authenticated
 using (owner_id=(select auth.uid())) with check (owner_id=(select auth.uid()));
create policy remove_own_devices on public.devices for delete to authenticated using (owner_id=(select auth.uid()));
create policy pi_reads_its_device on public.devices for select to authenticated using (agent_id=(select auth.uid()));
create policy pi_reports_status on public.devices for update to authenticated
 using (agent_id=(select auth.uid())) with check (agent_id=(select auth.uid()));

-- A person's photo sits in their own storage folder and, if it came from an Autolab, one they own.
create policy add_own_images on public.images for insert to authenticated with check (
 owner_id=(select auth.uid()) and (select public.is_person())
 and split_part(storage_path,'/',1)=(select auth.uid())::text
 and (device_id is null or exists(select 1 from public.devices d where d.id=device_id and d.owner_id=(select auth.uid())))
);
-- The Pi files its photos under its owner, in that Autolab's folder.
create policy pi_adds_images on public.images for insert to authenticated with check (
 exists(select 1 from public.devices d where d.id=device_id and d.agent_id=(select auth.uid()) and d.owner_id=images.owner_id)
 and split_part(storage_path,'/',1)=owner_id::text
 and split_part(storage_path,'/',2)=device_id::text
);
create policy edit_own_images on public.images for update to authenticated using (owner_id=(select auth.uid())) with check (owner_id=(select auth.uid()));
create policy remove_own_images on public.images for delete to authenticated using (owner_id=(select auth.uid()));
create policy add_own_analysis on public.image_analysis for insert to authenticated with check (
 exists(select 1 from public.images i where i.id=image_id and i.owner_id=(select auth.uid()))
);
create policy remove_own_analysis on public.image_analysis for delete to authenticated using (
 exists(select 1 from public.images i where i.id=image_id and i.owner_id=(select auth.uid()))
);

-- Actions: people send commands only to their own Autolabs, the Pi sees and
-- closes the ones sent to it, and nobody can delete the log.
create policy own_actions on public.actions for select to authenticated using (user_id=(select auth.uid()));
create policy pi_sees_its_actions on public.actions for select to authenticated using (
 exists(select 1 from public.devices d where d.id=device_id and d.agent_id=(select auth.uid()))
);
create policy add_own_actions on public.actions for insert to authenticated with check (
 user_id=(select auth.uid()) and (select public.is_person())
 and (device_id is null or exists(select 1 from public.devices d where d.id=device_id and d.owner_id=(select auth.uid())))
);
create policy edit_own_actions on public.actions for update to authenticated
 using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy pi_runs_its_actions on public.actions for update to authenticated using (
 exists(select 1 from public.devices d where d.id=device_id and d.agent_id=(select auth.uid()))
) with check (
 exists(select 1 from public.devices d where d.id=device_id and d.agent_id=(select auth.uid()))
);

-- Storage: a person writes only inside their own top folder, which 001 already
-- lets them read. The Pi writes only into its Autolab's folder under its owner.
create policy add_own_autolab_objects on storage.objects for insert to authenticated with check (
 bucket_id='autolab-images' and (storage.foldername(name))[1]=(select auth.uid())::text and (select public.is_person())
);
create policy remove_own_autolab_objects on storage.objects for delete to authenticated
 using (bucket_id='autolab-images' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy pi_adds_autolab_objects on storage.objects for insert to authenticated with check (
 bucket_id='autolab-images' and exists(
  select 1 from public.devices d where d.agent_id=(select auth.uid())
  and d.owner_id::text=(storage.foldername(objects.name))[1] and d.id::text=(storage.foldername(objects.name))[2]
 )
);
-- Storage reads a new file back as it saves it, so the Pi needs to see its own folder too.
-- objects.name is spelled out because devices has a name column of its own.
create policy pi_reads_autolab_objects on storage.objects for select to authenticated using (
 bucket_id='autolab-images' and exists(
  select 1 from public.devices d where d.agent_id=(select auth.uid())
  and d.owner_id::text=(storage.foldername(objects.name))[1] and d.id::text=(storage.foldername(objects.name))[2]
 )
);

-- Live preview: frames and preview requests travel on a private Realtime
-- channel named device:<id>, which only that Autolab's owner and its Pi can join.
create policy device_channel_listen on realtime.messages for select to authenticated using (
 exists(select 1 from public.devices d where 'device:'||d.id::text=(select realtime.topic())
  and (d.owner_id=(select auth.uid()) or d.agent_id=(select auth.uid())))
);
create policy device_channel_send on realtime.messages for insert to authenticated with check (
 exists(select 1 from public.devices d where 'device:'||d.id::text=(select realtime.topic())
  and (d.owner_id=(select auth.uid()) or d.agent_id=(select auth.uid())))
);

-- Realtime: the Pi hears new commands, and every open screen hears new photos, results and status.
do $$
begin
 if exists (select 1 from pg_publication where pubname='supabase_realtime') then
  alter publication supabase_realtime add table public.actions, public.images, public.image_analysis, public.devices;
 end if;
end $$;
