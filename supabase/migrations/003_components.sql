-- The Pi's parts list in lab mode. Apply once in the Supabase SQL Editor,
-- after 002_lab_mode.sql.
--
-- When the Pi's hardware drivers are configured (docs/firmware.md), it adds
-- the parts that answered (pumps, valves, HEPA fan, waste float switch,
-- sensors and outputs) to its status report, in the same shape the gateway
-- heartbeat carries. The Hardware screen shows them. Only a part that really
-- answered is listed, so the column stays empty until the hardware is on.
-- Row level security from 002_lab_mode.sql still decides who can write the
-- row; this only adds the column and lets the linked Pi update it.

alter table public.devices add column if not exists components jsonb
 check (components is null or (jsonb_typeof(components) = 'array' and jsonb_array_length(components) <= 64 and pg_column_size(components) <= 32768));

grant update (components) on public.devices to authenticated;
