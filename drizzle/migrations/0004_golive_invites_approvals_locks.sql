create table public.org_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role public.org_role not null default 'field_responder',
  department text,
  token text not null unique default encode(gen_random_bytes(18), 'hex'),
  expires_at timestamptz not null default now() + interval '7 days',
  created_by uuid,
  created_at timestamptz not null default now(),
  accepted_by uuid,
  accepted_at timestamptz,
  revoked_at timestamptz
);
grant select, insert, update, delete on public.org_invites to authenticated;
grant all on public.org_invites to service_role;
alter table public.org_invites enable row level security;
create policy "admins manage invites" on public.org_invites for all to authenticated
  using (public.has_org_role(organization_id, array['city_admin']::public.org_role[]))
  with check (public.has_org_role(organization_id, array['city_admin']::public.org_role[]) and created_by = auth.uid());

create table public.join_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null,
  email text,
  full_name text,
  status text not null default 'pending' check (status in ('pending','approved','denied')),
  created_at timestamptz not null default now(),
  decided_by uuid,
  decided_at timestamptz
);
create unique index join_requests_one_pending on public.join_requests(organization_id, user_id) where status = 'pending';
grant select on public.join_requests to authenticated;
grant all on public.join_requests to service_role;
alter table public.join_requests enable row level security;
create policy "admins read requests" on public.join_requests for select to authenticated
  using (public.has_org_role(organization_id, array['city_admin']::public.org_role[]));
create policy "own requests" on public.join_requests for select to authenticated using (user_id = auth.uid());

-- join code now creates a request for admin approval
create or replace function public.join_city(_code text, _full_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare org uuid;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select id into org from organizations where join_code = upper(trim(_code)) and not is_demo;
  if org is null then raise exception 'Invalid join code'; end if;
  if exists (select 1 from organization_members where organization_id=org and user_id=auth.uid()) then return org; end if;
  insert into join_requests(organization_id,user_id,email,full_name)
  values (org, auth.uid(), auth.jwt()->>'email', _full_name)
  on conflict (organization_id, user_id) where status = 'pending' do update set full_name = excluded.full_name;
  return org;
end $$;

create or replace function public.decide_join_request(_id uuid, _approve boolean, _role public.org_role default 'field_responder', _department text default null) returns void
language plpgsql security definer set search_path = public as $$
declare r join_requests;
begin
  select * into r from join_requests where id=_id and status='pending';
  if r.id is null then raise exception 'Request not found'; end if;
  if not public.has_org_role(r.organization_id, array['city_admin']::public.org_role[]) then raise exception 'Not allowed'; end if;
  update join_requests set status = case when _approve then 'approved' else 'denied' end, decided_by=auth.uid(), decided_at=now() where id=_id;
  if _approve then
    insert into organization_members(organization_id,user_id,email,full_name,role,department)
    values (r.organization_id, r.user_id, r.email, r.full_name, _role, _department)
    on conflict (organization_id,user_id) do nothing;
  end if;
end $$;
revoke execute on function public.decide_join_request(uuid,boolean,public.org_role,text) from public, anon;
grant execute on function public.decide_join_request(uuid,boolean,public.org_role,text) to authenticated;

create or replace function public.rotate_join_code(_org uuid) returns text
language plpgsql security definer set search_path = public as $$
declare c text;
begin
  if not public.has_org_role(_org, array['city_admin']::public.org_role[]) then raise exception 'Not allowed'; end if;
  c := upper(substr(encode(gen_random_bytes(8),'hex'),1,8));
  update organizations set join_code=c where id=_org and not is_demo;
  return c;
end $$;
revoke execute on function public.rotate_join_code(uuid) from public, anon;
grant execute on function public.rotate_join_code(uuid) to authenticated;

create or replace function public.get_invite(_token text) returns table(organization_name text, organization_state text, email text, role public.org_role, department text, expires_at timestamptz, status text)
language sql stable security definer set search_path = public as $$
  select o.name, o.state, i.email, i.role, i.department, i.expires_at,
    case when i.revoked_at is not null then 'revoked' when i.accepted_at is not null then 'accepted' when i.expires_at < now() then 'expired' else 'valid' end
  from org_invites i join organizations o on o.id=i.organization_id where i.token=_token
$$;
grant execute on function public.get_invite(text) to anon, authenticated;

create or replace function public.accept_invite(_token text, _full_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare i org_invites;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select * into i from org_invites where token=_token for update;
  if i.id is null or i.revoked_at is not null or i.accepted_at is not null or i.expires_at < now() then raise exception 'Invite is no longer valid'; end if;
  if lower(i.email) <> lower(coalesce(auth.jwt()->>'email','')) then raise exception 'This invite was sent to a different email address'; end if;
  insert into organization_members(organization_id,user_id,email,full_name,role,department)
  values (i.organization_id, auth.uid(), i.email, _full_name, i.role, i.department)
  on conflict (organization_id,user_id) do update set role=excluded.role, department=coalesce(excluded.department, organization_members.department);
  update org_invites set accepted_by=auth.uid(), accepted_at=now() where id=i.id;
  return i.organization_id;
end $$;
revoke execute on function public.accept_invite(text,text) from public, anon;
grant execute on function public.accept_invite(text,text) to authenticated;

-- entry review + lock
do $$
declare t text;
begin
  foreach t in array array['field_logs','labor_entries','equipment_entries','material_entries'] loop
    execute format('alter table public.%I add column review_status text not null default ''pending'' check (review_status in (''pending'',''approved'',''rejected''))', t);
    execute format('alter table public.%I add column reviewed_by uuid, add column reviewed_at timestamptz, add column review_note text', t);
  end loop;
end $$;

create or replace function public.guard_entry_review() returns trigger
language plpgsql security definer set search_path = public as $$
declare reviewer boolean; skip text[] := array['review_status','reviewed_by','reviewed_at','review_note','edited_by','edited_at','fema_category','rate_verified'];
  k text; o jsonb; n jsonb;
begin
  reviewer := public.has_org_role(coalesce(new.organization_id, old.organization_id), array['city_admin','eoc_commander','finance_auditor']::public.org_role[])
    or public.is_demo_org(coalesce(new.organization_id, old.organization_id)) or auth.uid() is null and current_user <> 'anon';
  if tg_op = 'INSERT' then
    new.review_status := 'pending'; new.reviewed_by := null; new.reviewed_at := null; new.review_note := null;
    return new;
  end if;
  if tg_op = 'DELETE' then
    if old.review_status = 'approved' and auth.uid() is not null then raise exception 'Approved entries are locked. Reopen the entry before deleting it.'; end if;
    return old;
  end if;
  if (new.review_status, new.review_note) is distinct from (old.review_status, old.review_note) then
    if not reviewer then raise exception 'Only City Admins, EOC Commanders and Finance Auditors can review entries'; end if;
    new.reviewed_by := auth.uid(); new.reviewed_at := now();
  else
    new.reviewed_by := old.reviewed_by; new.reviewed_at := old.reviewed_at;
  end if;
  if old.review_status = 'approved' and new.review_status = 'approved' then
    o := to_jsonb(old); n := to_jsonb(new);
    foreach k in array skip loop o := o - k; n := n - k; end loop;
    if o is distinct from n then raise exception 'Approved entries are locked. Reopen the entry before editing it.'; end if;
  end if;
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['field_logs','labor_entries','equipment_entries','material_entries'] loop
    execute format('create trigger aa_guard_review_%1$s before insert or update or delete on public.%1$I for each row execute function public.guard_entry_review()', t);
  end loop;
end $$;