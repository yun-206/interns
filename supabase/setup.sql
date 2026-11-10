-- =========================================================
-- interns — Supabase 설정 (SQL Editor에 통째로 붙여넣고 Run)
-- 여러 번 실행해도 괜찮아요 (이미 있으면 건너뜀)
--
-- 먼저 할 일: Authentication → Sign In / Providers → "Allow anonymous sign-ins" 켜기
-- 입장 비밀번호는 이 파일에 없어요. Run 다음에 README의 '비밀번호 정하기' 한 줄을 따로 실행하세요.
--
-- 보안 구조
--   - 브라우저는 '익명 로그인'으로 기기마다 auth 사용자 하나를 받아요.
--   - 비밀번호를 맞혀 입장(join_team)하면 그 기기가 팀원과 연결돼요(member_devices).
--   - 모든 표는 '연결된 기기'만 읽을 수 있고, 1:1 쪽지는 보낸 사람·받은 사람만 읽을 수 있어요.
--   - 비밀번호(app_settings)는 브라우저에서 절대 못 읽어요. 함수 안에서만 비교해요.
-- =========================================================

-- 1) 표 -----------------------------------------------------
create table if not exists public.members (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique check (char_length(name) between 1 and 12),
  role       text not null default '' check (char_length(role) <= 20),     -- 소속(선택)
  joined_at  timestamptz not null default now()
);

create table if not exists public.member_devices (
  auth_uid   uuid primary key,                                              -- auth.users(id) (익명 로그인)
  member     uuid not null references public.members(id) on delete cascade,
  linked_at  timestamptz not null default now()
);

create table if not exists public.notices (
  id          uuid primary key default gen_random_uuid(),
  tag         text not null default '공지' check (tag in ('공지', '약속', '정보')),
  title       text not null check (char_length(title) between 1 and 60),
  body        text not null default '' check (char_length(body) <= 1000),
  author      uuid not null references public.members(id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- recipient가 비어 있으면(null) 단체방 쪽지
create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  sender      uuid not null references public.members(id) on delete cascade,
  recipient   uuid references public.members(id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 500),
  created_at  timestamptz not null default now(),
  read_at     timestamptz,
  check (recipient is null or sender <> recipient)
);
create index if not exists messages_pair_idx on public.messages (sender, recipient, created_at);

-- 첨부(사진·파일): 파일 자체는 Storage 'chat-files' 버킷, 여기엔 경로·이름·종류·크기만
alter table public.messages add column if not exists file_path text;
alter table public.messages add column if not exists file_name text check (char_length(file_name) <= 120);
alter table public.messages add column if not exists file_type text check (char_length(file_type) <= 100);
alter table public.messages add column if not exists file_size int  check (file_size between 0 and 10485760);
do $$
declare c record;
begin
  -- 예전 '본문 1~500자' 규칙을 '본문 또는 첨부 중 하나는 있어야 함'으로 교체
  for c in select conname from pg_constraint
    where conrelid = 'public.messages'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%char_length(body)%'
  loop
    execute format('alter table public.messages drop constraint %I', c.conname);
  end loop;
  alter table public.messages add constraint messages_body_or_file
    check (char_length(body) <= 500 and (char_length(body) >= 1 or file_path is not null));
end $$;

-- 쪽지 첨부가 들어갈 폴더: 단체방은 'group', 1:1은 두 사람 id를 정렬해 '_'로 이은 이름
create or replace function public.chat_scope(p_sender uuid, p_recipient uuid)
returns text
language sql
immutable
as $$
  select case when p_recipient is null then 'group'
              else least(p_sender::text, p_recipient::text) || '_' || greatest(p_sender::text, p_recipient::text) end;
$$;

-- 단체방을 어디까지 읽었는지 (팀원마다 한 줄)
create table if not exists public.chat_reads (
  member   uuid primary key references public.members(id) on delete cascade,
  read_at  timestamptz not null default now()
);

create table if not exists public.schedules (
  id          uuid primary key default gen_random_uuid(),
  member      uuid not null references public.members(id) on delete cascade,
  kind        text not null check (char_length(kind) between 1 and 10),
  start_date  date not null,
  end_date    date not null,
  memo        text not null default '' check (char_length(memo) <= 40),
  created_at  timestamptz not null default now(),
  check (end_date >= start_date and end_date - start_date <= 30)
);

-- 멤버가 직접 만든 일정 종류 (기본 8종 말고). 만든 사람만 지울 수 있고, 지워도 이미 올린 일정의 글자는 그대로
create table if not exists public.schedule_kinds (
  name        text primary key check (char_length(name) between 1 and 10 and name = btrim(name)),
  color       text not null check (color in ('off', 'half', 'trip', 'edu', 'home', 'etc', 'pink', 'green', 'red', 'blue')),
  created_by  uuid references public.members(id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- v1/v2에서 올라온 경우: 일정 종류를 정해진 8개에서 자유 글자(1~10자)로 바꿈
do $$
declare r record;
begin
  for r in select conname from pg_constraint
    where conrelid = 'public.schedules'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%kind%'
  loop
    execute format('alter table public.schedules drop constraint %I', r.conname);
  end loop;
  alter table public.schedules add constraint schedules_kind_len check (char_length(kind) between 1 and 10);
end $$;

create table if not exists public.lunch_picks (
  id          uuid primary key default gen_random_uuid(),
  picked_by   uuid not null references public.members(id) on delete cascade,
  mode        text not null check (mode in ('wheel', 'draw')),
  candidates  text[] not null check (cardinality(candidates) between 1 and 4),
  result      int not null,
  created_at  timestamptz not null default now(),
  check (result >= 0 and result < cardinality(candidates))
);

create table if not exists public.activity (
  id     bigint generated always as identity primary key,
  who    uuid references public.members(id) on delete cascade,
  what   text not null check (char_length(what) <= 40),
  place  text not null default '' check (char_length(place) <= 80),
  at     timestamptz not null default now()
);

create table if not exists public.app_settings (
  key    text primary key,
  value  text not null
);

-- 2) 지금 이 기기(익명 로그인)가 어떤 팀원인지 --------------------
create or replace function public.my_member_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select member from public.member_devices where auth_uid = auth.uid();
$$;

-- 3) 행 단위 보안(RLS) — 입장한 기기만 ------------------------------
alter table public.members        enable row level security;
alter table public.member_devices enable row level security;
alter table public.notices        enable row level security;
alter table public.messages       enable row level security;
alter table public.chat_reads     enable row level security;
alter table public.schedules      enable row level security;
alter table public.lunch_picks    enable row level security;
alter table public.schedule_kinds enable row level security;
alter table public.activity       enable row level security;
alter table public.app_settings   enable row level security;

do $$
declare r record;
begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public'
    and tablename in ('members','member_devices','notices','messages','chat_reads','schedules','schedule_kinds','lunch_picks','activity','app_settings')
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

create policy "members read"      on public.members     for select to authenticated using (public.my_member_id() is not null);

create policy "notices read"      on public.notices     for select to authenticated using (public.my_member_id() is not null);
create policy "notices insert"    on public.notices     for insert to authenticated with check (author = public.my_member_id());
create policy "notices delete"    on public.notices     for delete to authenticated using (author = public.my_member_id());

-- 단체방은 모두, 1:1은 보낸 사람·받은 사람만
create policy "messages read"     on public.messages    for select to authenticated using (
  public.my_member_id() is not null and (recipient is null or sender = public.my_member_id() or recipient = public.my_member_id()));
create policy "messages insert"   on public.messages    for insert to authenticated with check (
  sender = public.my_member_id() and read_at is null
  and (file_path is null or split_part(file_path, '/', 1) = public.chat_scope(sender, recipient)));
create policy "messages read-mark" on public.messages   for update to authenticated using (recipient = public.my_member_id()) with check (recipient = public.my_member_id());

create policy "chat_reads read"   on public.chat_reads  for select to authenticated using (public.my_member_id() is not null);
create policy "chat_reads insert" on public.chat_reads  for insert to authenticated with check (member = public.my_member_id());
create policy "chat_reads update" on public.chat_reads  for update to authenticated using (member = public.my_member_id()) with check (member = public.my_member_id());

create policy "schedules read"    on public.schedules   for select to authenticated using (public.my_member_id() is not null);
create policy "schedules insert"  on public.schedules   for insert to authenticated with check (member = public.my_member_id());
create policy "schedules delete"  on public.schedules   for delete to authenticated using (member = public.my_member_id());

create policy "kinds read"        on public.schedule_kinds for select to authenticated using (public.my_member_id() is not null);
create policy "kinds insert"      on public.schedule_kinds for insert to authenticated with check (
  created_by = public.my_member_id() and (select count(*) from public.schedule_kinds) < 30);   -- 너무 많아지지 않게 30개까지
create policy "kinds delete"      on public.schedule_kinds for delete to authenticated using (created_by = public.my_member_id());

create policy "lunch read"        on public.lunch_picks for select to authenticated using (public.my_member_id() is not null);
create policy "lunch insert"      on public.lunch_picks for insert to authenticated with check (picked_by = public.my_member_id());

create policy "activity read"     on public.activity    for select to authenticated using (public.my_member_id() is not null);
create policy "activity insert"   on public.activity    for insert to authenticated with check (who = public.my_member_id());
-- member_devices, app_settings: 정책 없음 → 브라우저에서 직접 못 읽고 못 씀 (함수로만)

revoke all on all tables in schema public from anon;
revoke all on public.member_devices, public.app_settings from authenticated;
grant select on public.members to authenticated;
grant select, insert, delete on public.notices to authenticated;
grant select, insert on public.messages to authenticated;
revoke update on public.messages from authenticated;
grant update (read_at) on public.messages to authenticated;      -- 읽음 표시만 바꿀 수 있음
grant select, insert, update on public.chat_reads to authenticated;
grant select, insert, delete on public.schedules to authenticated;
grant select, insert on public.lunch_picks to authenticated;
grant select, insert, delete on public.schedule_kinds to authenticated;
grant select, insert on public.activity to authenticated;

-- 4) 함수 (비밀번호는 서버 안에서만 비교) -------------------------
create or replace function public.check_password(p_password text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce(p_password = (select value from public.app_settings where key = 'password'), false);
$$;

-- 비밀번호가 맞으면 지금 팀원 이름 목록 (입장 화면의 '이미 있는 팀원' 안내용)
create or replace function public.member_names(p_password text)
returns setof text
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.check_password(p_password) then
    raise exception 'wrong_password' using errcode = '28P01';
  end if;
  return query select name from public.members order by joined_at;
end;
$$;

-- 지금 이 기기의 팀원 (없으면 null)
create or replace function public.whoami()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select row_to_json(m) from public.members m where m.id = public.my_member_id();
$$;

-- 입장: 비밀번호가 맞으면 팀원을 만들거나(같은 이름이면 그 팀원으로 이어서) 이 기기를 연결
create or replace function public.join_team(p_password text, p_name text, p_role text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_name text := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
  v_role text := btrim(coalesce(p_role, ''));
  v_m    public.members;
  v_new  boolean := false;
begin
  if v_uid is null then
    raise exception 'no_session' using errcode = '28000';
  end if;
  if not public.check_password(p_password) then
    raise exception 'wrong_password' using errcode = '28P01';
  end if;
  if v_name = '' then
    raise exception 'missing_fields' using errcode = '22023';
  end if;

  select * into v_m from public.members where name = v_name;
  if found then
    if v_role <> '' and v_role <> v_m.role then
      update public.members set role = v_role where id = v_m.id returning * into v_m;
    end if;
  else
    insert into public.members (name, role) values (v_name, v_role) returning * into v_m;
    v_new := true;
    insert into public.activity (who, what, place) values (v_m.id, '들어왔어요', 'interns');
  end if;

  insert into public.member_devices (auth_uid, member) values (v_uid, v_m.id)
  on conflict (auth_uid) do update set member = excluded.member, linked_at = now();

  return json_build_object('member', row_to_json(v_m), 'is_new', v_new);
end;
$$;

-- 이 기기 연결 끊기 ('이 기기에서 나가기')
create or replace function public.leave_device()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.member_devices where auth_uid = auth.uid();
$$;

-- 전체 초기화: 비밀번호가 맞으면 모든 데이터 삭제
create or replace function public.reset_all(p_password text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.check_password(p_password) then
    raise exception 'wrong_password' using errcode = '28P01';
  end if;
  -- 첨부 파일 (Storage가 SQL 삭제를 막는 프로젝트면 건너뜀 → 대시보드 Storage에서 chat-files 비우기)
  begin
    delete from storage.objects where bucket_id = 'chat-files';
  exception when others then null;
  end;
  delete from public.lunch_picks    where true;
  delete from public.schedules      where true;
  delete from public.schedule_kinds where true;
  delete from public.chat_reads     where true;
  delete from public.messages       where true;
  delete from public.notices        where true;
  delete from public.activity       where true;
  delete from public.member_devices where true;
  delete from public.members        where true;
end;
$$;

revoke all on function public.my_member_id()                 from public;
revoke all on function public.check_password(text)           from public;
revoke all on function public.member_names(text)             from public;
revoke all on function public.whoami()                       from public;
revoke all on function public.join_team(text, text, text)    from public;
revoke all on function public.leave_device()                 from public;
revoke all on function public.reset_all(text)                from public;
grant execute on function public.my_member_id()              to authenticated;
grant execute on function public.check_password(text)        to anon, authenticated;
grant execute on function public.member_names(text)          to anon, authenticated;
grant execute on function public.whoami()                    to authenticated;
grant execute on function public.join_team(text, text, text) to authenticated;
grant execute on function public.leave_device()              to authenticated;
grant execute on function public.reset_all(text)             to authenticated;

-- 5) 첨부 파일 저장소 (비공개 버킷, 파일당 10MB) ------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('chat-files', 'chat-files', false, 10485760)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

-- 이 파일 경로를 지금 기기가 볼 수 있나: 단체방 폴더는 멤버 모두, 1:1 폴더는 두 사람만
create or replace function public.can_access_chat_path(p_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.my_member_id() is not null and (
    split_part(p_name, '/', 1) = 'group'
    or public.my_member_id()::text = any(string_to_array(split_part(p_name, '/', 1), '_'))
  );
$$;
revoke all on function public.can_access_chat_path(text) from public;
grant execute on function public.can_access_chat_path(text) to authenticated;

drop policy if exists "chat files read"   on storage.objects;
drop policy if exists "chat files upload" on storage.objects;
create policy "chat files read"   on storage.objects for select to authenticated
  using (bucket_id = 'chat-files' and public.can_access_chat_path(name));
create policy "chat files upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'chat-files' and public.can_access_chat_path(name));

-- 6) 실시간: 표가 바뀌면 열려 있는 화면에 알림 (RLS에 맞게 각자 볼 수 있는 것만) ----
do $$
declare t text;
begin
  foreach t in array array['members', 'notices', 'messages', 'chat_reads', 'schedules', 'schedule_kinds', 'lunch_picks', 'activity'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
