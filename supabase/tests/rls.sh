#!/usr/bin/env bash
# Checks lab mode's row level security as two signed in people, A and B, on
# a plain Postgres with stand-ins for Supabase (stub.sql). Connects with the
# usual PGHOST, PGPORT, PGUSER and PGPASSWORD, as a superuser, because it
# creates a fresh autolab_rls database each run.
set -u
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB=autolab_rls
# Setup notices (roles that already exist, a test server without logical WAL) aren't failures.
export PGOPTIONS="${PGOPTIONS:-} -c client_min_messages=error"
A=aaaaaaaa-0000-0000-0000-00000000000a; B=bbbbbbbb-0000-0000-0000-00000000000b
D=dddddddd-0000-0000-0000-00000000000d; I=11111111-0000-0000-0000-000000000001; J=22222222-0000-0000-0000-000000000002
pass=0; fail=0

psql -qX -v ON_ERROR_STOP=1 -d postgres -c "drop database if exists $DB" -c "create database $DB" || exit 1
for file in "$HERE/stub.sql" "$HERE"/../migrations/*.sql; do
  psql -qX -v ON_ERROR_STOP=1 -d $DB -f "$file" > /dev/null || { echo "Could not apply $file"; exit 1; }
done

# Runs SQL as the database owner, or as the signed in person with that user id.
run() {
  if [ "$1" = postgres ]; then psql -qXAt -v ON_ERROR_STOP=1 -d $DB -c "$2" 2>&1; return; fi
  psql -qXAt -v ON_ERROR_STOP=1 -d $DB -c "begin; set local role authenticated; select set_config('request.jwt.claim.sub', '$1', true); $2; commit;" 2>&1
}
expect_ok() { out=$(run "$1" "$2"); if [ $? -eq 0 ]; then pass=$((pass+1)); else fail=$((fail+1)); echo "FAIL (wanted ok): $3 :: $out"; fi; }
expect_err() { out=$(run "$1" "$2"); if [ $? -ne 0 ]; then pass=$((pass+1)); else fail=$((fail+1)); echo "FAIL (wanted error): $3 :: $out"; fi; }
expect_val() { out=$(run "$1" "$2" | tail -1); if [ "$out" = "$3" ]; then pass=$((pass+1)); else fail=$((fail+1)); echo "FAIL (wanted $3, got $out): $4"; fi; }
psql -qX -d $DB -c "insert into auth.users values ('$A','alice.lab@uni.edu'),('$B','bob@uni.edu')" > /dev/null
expect_val $A "select display_name from public.profiles" "alice.lab" "profile made at sign up"
expect_val $A "select count(*) from public.profiles" "1" "only your own profile is visible"
expect_ok $A "update public.profiles set display_name='Alice' where id='$A'" "rename own profile"
expect_ok $A "insert into public.devices(id,name) values ('$D','Bench Autolab')" "add own Autolab"
expect_val $B "select count(*) from public.devices" "0" "other people's Autolabs are hidden"
expect_err $B "insert into public.devices(id,name) values ('$D','Mine now')" "can't take an Autolab someone owns"
expect_err $B "insert into public.devices(id,name,owner_id) values (gen_random_uuid(),'x','$A')" "can't add an Autolab for someone else"
expect_val $B "with u as (update public.devices set name='hijack' where id='$D' returning 1) select count(*) from u" "0" "can't rename someone else's Autolab"
expect_ok $A "update public.devices set status='online', camera_online=true, last_seen_at=now(), simulated=true, agent_version='1.1.0' where id='$D'" "station updates status"
expect_err $A "update public.devices set owner_id='$B' where id='$D'" "owner can't be changed"
expect_ok $A "insert into storage.objects(bucket_id,name) values ('autolab-images','$A/$D/$I.jpg')" "upload into own folder"
expect_err $A "insert into storage.objects(bucket_id,name) values ('autolab-images','$B/$D/$J.jpg')" "upload into someone else's folder"
expect_val $B "select count(*) from storage.objects" "0" "other people's files are hidden"
expect_ok $A "insert into public.images(id,device_id,storage_path,width,height,source,bytes) values ('$I','$D','$A/$D/$I.jpg',4056,3040,'pi',812345)" "save a photo row"
expect_ok $A "insert into public.images(id,device_id,storage_path,width,height,source) values ('$J',null,'$A/local/$J.jpg',640,480,'upload')" "save an upload without an Autolab"
expect_err $A "insert into public.images(id,device_id,storage_path,width,height,source) values (gen_random_uuid(),'$D','$B/x.jpg',1,1,'pi')" "photo path outside own folder"
expect_err $A "insert into public.images(id,device_id,storage_path,width,height,source) values (gen_random_uuid(),'$D','$A/y.jpg',1,1,'webcam')" "unknown photo source"
expect_err $B "insert into public.images(id,device_id,storage_path,width,height,source) values (gen_random_uuid(),'$D','$B/z.jpg',1,1,'pi')" "photo for someone else's Autolab"
expect_ok $A "insert into public.image_analysis(image_id,model_name,result_json) values ('$I','YOLOv10n','{\"detections\":[]}')" "save own analysis"
expect_err $B "insert into public.image_analysis(image_id,model_name,result_json) values ('$I','YOLOv10n','{}')" "analysis on someone else's photo"
expect_ok $A "update public.images set analysis_status='done' where id='$I'" "mark photo analyzed"
expect_ok $A "insert into public.actions(device_id,kind,origin) values ('$D','capture_photo','remote')" "send a remote command"
expect_val $A "select status||':'||(user_id='$A')::text from public.actions limit 1" "pending:true" "command defaults to pending for the sender"
expect_ok $A "update public.actions set status='running' where device_id='$D' and status='pending'" "station claims the command"
expect_val $A "select (started_at is not null and completed_at is null)::text from public.actions" "true" "the claim is stamped"
expect_ok $A "update public.actions set status='done', image_id='$I', result='{\"width\":4056}' where device_id='$D'" "station records the result"
expect_val $A "select (completed_at>=started_at and started_at>=created_at)::text from public.actions" "true" "times come from the database"
expect_err $A "update public.actions set status='failed' where device_id='$D'" "an ended command can't change"
expect_err $A "update public.actions set completed_at=now()" "times can't be set by hand"
expect_ok $A "insert into public.actions(device_id,kind,origin,status,created_at) values ('$D','start_preview','station','done','2000-01-01')" "log a finished command"
expect_val $A "select count(*) from public.actions where created_at < now() - interval '1 day' or completed_at is null" "0" "a screen can't backdate or leave out times"
expect_err $A "delete from public.actions" "the log can't be deleted"
expect_err $A "update public.actions set kind='stop_preview'" "a logged command can't be rewritten"
expect_err $B "insert into public.actions(device_id,kind,origin) values ('$D','capture_photo','remote')" "command to someone else's Autolab"
expect_val $B "select count(*) from public.actions" "0" "other people's log is hidden"
expect_err $A "insert into public.actions(device_id,kind,origin) values ('$D','self_destruct','remote')" "unknown command"
expect_err $A "select count(*) from public.device_credentials" "credentials stay hidden"
expect_ok $A "delete from public.images where id='$J'" "delete own photo"
expect_ok $A "delete from public.images where id='$I'" "delete a photo a command took"
expect_val $A "select count(*) from public.actions where image_id is not null" "0" "its log entry stays, without the link"
expect_ok $A "delete from storage.objects where name='$A/$D/$I.jpg'" "delete own file"
expect_val postgres "select count(*) from pg_publication_tables where pubname='supabase_realtime'" "4" "realtime covers actions, images, analysis and devices"
expect_ok $A "delete from public.devices where id='$D'" "remove own Autolab"
expect_val $A "select count(*) from public.actions" "0" "its log goes with it"
echo "passed $pass, failed $fail"
[ $fail -eq 0 ]
