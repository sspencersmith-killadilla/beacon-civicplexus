
create type public.org_role as enum ('city_admin','eoc_commander','field_responder','finance_auditor');
create type public.incident_type as enum ('freeze','flood','severe_storm','cyber','utility_outage','other');
create type public.incident_status as enum ('active','recovery','closed');
create type public.fema_category as enum ('A','B','C','D','E','F','G');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  state text not null default '',
  logo_url text,
  primary_color text not null default '#D97706',
  join_code text not null unique default upper(substr(md5(random()::text),1,8)),
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null,
  email text,
  full_name text,
  role public.org_role not null default 'field_responder',
  department text,
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);
create table public.departments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);
create table public.rate_cards (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  kind text not null check (kind in ('labor','equipment')),
  name text not null,
  code text,
  hourly_rate numeric(10,2) not null default 0,
  fringe_pct numeric(6,2) not null default 0,
  created_at timestamptz not null default now()
);
create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  incident_type public.incident_type not null default 'other',
  status public.incident_status not null default 'active',
  fema_declaration text,
  operational_period text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now()
);

-- shared columns for operational entries
create table public.field_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  incident_id uuid not null references public.incidents(id) on delete cascade,
  client_generated_id text not null,
  entry_time timestamptz not null default now(),
  original_timestamp timestamptz not null default now(),
  timestamp_edited boolean not null default false,
  department text,
  category text not null default 'Operational Decision',
  location_address text,
  gps_lat double precision,
  gps_lng double precision,
  fema_category public.fema_category,
  notes text not null default '',
  author_name text,
  created_by uuid,
  created_at timestamptz not null default now(),
  edited_by uuid, edited_at timestamptz,
  unique (organization_id, client_generated_id)
);
create table public.labor_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  incident_id uuid not null references public.incidents(id) on delete cascade,
  client_generated_id text not null,
  entry_time timestamptz not null default now(),
  original_timestamp timestamptz not null default now(),
  timestamp_edited boolean not null default false,
  staff_name text not null,
  role_title text,
  department text,
  fema_category public.fema_category not null default 'B',
  regular_hours numeric(8,2) not null default 0,
  overtime_hours numeric(8,2) not null default 0,
  hourly_rate numeric(10,2) not null default 0,
  fringe_pct numeric(6,2) not null default 0,
  total_cost numeric(12,2) generated always as (round(((regular_hours*hourly_rate) + (overtime_hours*hourly_rate*1.5)) * (1 + fringe_pct/100.0), 2)) stored,
  task_description text,
  rate_verified boolean not null default false,
  author_name text,
  created_by uuid,
  created_at timestamptz not null default now(),
  edited_by uuid, edited_at timestamptz,
  unique (organization_id, client_generated_id)
);
create table public.equipment_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  incident_id uuid not null references public.incidents(id) on delete cascade,
  client_generated_id text not null,
  entry_time timestamptz not null default now(),
  original_timestamp timestamptz not null default now(),
  timestamp_edited boolean not null default false,
  equipment_name text not null,
  fema_code text,
  operator_name text,
  department text,
  fema_category public.fema_category not null default 'B',
  active_hours numeric(8,2) not null default 0,
  standby_hours numeric(8,2) not null default 0,
  hourly_rate numeric(10,2) not null default 0,
  total_cost numeric(12,2) generated always as (round(active_hours*hourly_rate, 2)) stored,
  work_location text,
  rate_verified boolean not null default false,
  author_name text,
  created_by uuid,
  created_at timestamptz not null default now(),
  edited_by uuid, edited_at timestamptz,
  unique (organization_id, client_generated_id)
);
create table public.material_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  incident_id uuid not null references public.incidents(id) on delete cascade,
  client_generated_id text not null,
  entry_time timestamptz not null default now(),
  original_timestamp timestamptz not null default now(),
  timestamp_edited boolean not null default false,
  vendor text,
  item_description text not null,
  department text,
  quantity numeric(12,2) not null default 0,
  unit_cost numeric(12,2) not null default 0,
  total_cost numeric(14,2) generated always as (round(quantity*unit_cost, 2)) stored,
  fema_category public.fema_category not null default 'B',
  receipt_path text,
  rate_verified boolean not null default false,
  author_name text,
  created_by uuid,
  created_at timestamptz not null default now(),
  edited_by uuid, edited_at timestamptz,
  unique (organization_id, client_generated_id)
);
create table public.evidence_photos (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  incident_id uuid not null references public.incidents(id) on delete cascade,
  field_log_id uuid references public.field_logs(id) on delete set null,
  client_generated_id text not null,
  storage_path text not null,
  caption text,
  phase text not null default 'during' check (phase in ('before','during','after')),
  gps_lat double precision,
  gps_lng double precision,
  taken_at timestamptz not null default now(),
  original_timestamp timestamptz not null default now(),
  timestamp_edited boolean not null default false,
  author_name text,
  created_by uuid,
  created_at timestamptz not null default now(),
  edited_by uuid, edited_at timestamptz,
  unique (organization_id, client_generated_id)
);
create table public.aar_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  incident_id uuid not null unique references public.incidents(id) on delete cascade,
  executive_summary text not null default '',
  corrective_actions jsonb not null default '[]'::jsonb,
  updated_by uuid,
  updated_at timestamptz not null default now()
);
create table public.record_edits (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  table_name text not null,
  record_id uuid not null,
  edited_by uuid,
  edited_at timestamptz not null default now(),
  previous jsonb not null
);

-- grants
grant select on public.organizations, public.departments, public.rate_cards, public.incidents, public.field_logs, public.labor_entries, public.equipment_entries, public.material_entries, public.evidence_photos, public.aar_reports to anon;
grant select, insert, update, delete on public.organizations, public.organization_members, public.departments, public.rate_cards, public.incidents, public.field_logs, public.labor_entries, public.equipment_entries, public.material_entries, public.evidence_photos, public.aar_reports, public.record_edits to authenticated;
grant all on public.organizations, public.organization_members, public.departments, public.rate_cards, public.incidents, public.field_logs, public.labor_entries, public.equipment_entries, public.material_entries, public.evidence_photos, public.aar_reports, public.record_edits to service_role;

-- helpers
create or replace function public.is_org_member(_org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from organization_members where organization_id=_org and user_id=auth.uid())
$$;
create or replace function public.has_org_role(_org uuid, _roles public.org_role[]) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from organization_members where organization_id=_org and user_id=auth.uid() and role = any(_roles))
$$;
create or replace function public.is_demo_org(_org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_demo from organizations where id=_org), false)
$$;
create or replace function public.can_read_org(_org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_org_member(_org) or public.is_demo_org(_org)
$$;

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.departments enable row level security;
alter table public.rate_cards enable row level security;
alter table public.incidents enable row level security;
alter table public.field_logs enable row level security;
alter table public.labor_entries enable row level security;
alter table public.equipment_entries enable row level security;
alter table public.material_entries enable row level security;
alter table public.evidence_photos enable row level security;
alter table public.aar_reports enable row level security;
alter table public.record_edits enable row level security;

create policy "read orgs" on public.organizations for select to anon, authenticated using (public.can_read_org(id));
create policy "admins update org" on public.organizations for update to authenticated using (public.has_org_role(id, array['city_admin']::public.org_role[]));

create policy "members read members" on public.organization_members for select to authenticated using (public.is_org_member(organization_id));
create policy "admins update members" on public.organization_members for update to authenticated using (public.has_org_role(organization_id, array['city_admin']::public.org_role[]));
create policy "admins remove members" on public.organization_members for delete to authenticated using (public.has_org_role(organization_id, array['city_admin']::public.org_role[]) and user_id <> auth.uid());

create policy "read depts" on public.departments for select to anon, authenticated using (public.can_read_org(organization_id));
create policy "admins write depts" on public.departments for all to authenticated using (public.has_org_role(organization_id, array['city_admin']::public.org_role[])) with check (public.has_org_role(organization_id, array['city_admin']::public.org_role[]));
create policy "read rates" on public.rate_cards for select to anon, authenticated using (public.can_read_org(organization_id));
create policy "admins write rates" on public.rate_cards for all to authenticated using (public.has_org_role(organization_id, array['city_admin']::public.org_role[])) with check (public.has_org_role(organization_id, array['city_admin']::public.org_role[]));

create policy "read incidents" on public.incidents for select to anon, authenticated using (public.can_read_org(organization_id));
create policy "command writes incidents" on public.incidents for all to authenticated using (public.has_org_role(organization_id, array['city_admin','eoc_commander']::public.org_role[])) with check (public.has_org_role(organization_id, array['city_admin','eoc_commander']::public.org_role[]));

create policy "read aar" on public.aar_reports for select to anon, authenticated using (public.can_read_org(organization_id));
create policy "command writes aar" on public.aar_reports for all to authenticated using (public.has_org_role(organization_id, array['city_admin','eoc_commander']::public.org_role[])) with check (public.has_org_role(organization_id, array['city_admin','eoc_commander']::public.org_role[]));

create policy "members read edits" on public.record_edits for select to authenticated using (public.is_org_member(organization_id));

do $$
declare t text;
begin
  foreach t in array array['field_logs','labor_entries','equipment_entries','material_entries','evidence_photos'] loop
    execute format('create policy "read %1$s" on public.%1$I for select to anon, authenticated using (public.can_read_org(organization_id))', t);
    execute format('create policy "insert %1$s" on public.%1$I for insert to authenticated with check (created_by = auth.uid() and public.has_org_role(organization_id, array[''city_admin'',''eoc_commander'',''field_responder'']::public.org_role[]) and exists (select 1 from public.incidents i where i.id = incident_id and i.organization_id = %1$I.organization_id))', t);
    execute format('create policy "update %1$s" on public.%1$I for update to authenticated using ((created_by = auth.uid() and public.is_org_member(organization_id)) or public.has_org_role(organization_id, array[''city_admin'',''eoc_commander'',''finance_auditor'']::public.org_role[])) with check (public.is_org_member(organization_id))', t);
    execute format('create policy "delete %1$s" on public.%1$I for delete to authenticated using (public.has_org_role(organization_id, array[''city_admin'',''eoc_commander'']::public.org_role[]))', t);
  end loop;
end $$;

-- audit trigger
create or replace function public.audit_entry_update() returns trigger
language plpgsql security definer set search_path = public as $$
declare ts_col text;
begin
  new.created_by := old.created_by;
  new.created_at := old.created_at;
  new.original_timestamp := old.original_timestamp;
  new.organization_id := old.organization_id;
  new.client_generated_id := old.client_generated_id;
  new.edited_by := auth.uid();
  new.edited_at := now();
  if tg_table_name = 'evidence_photos' then
    if new.taken_at is distinct from old.taken_at then new.timestamp_edited := true; end if;
  else
    if (to_jsonb(new)->>'entry_time') is distinct from (to_jsonb(old)->>'entry_time') then new.timestamp_edited := true; end if;
  end if;
  insert into record_edits(organization_id, table_name, record_id, edited_by, previous)
  values (old.organization_id, tg_table_name, old.id, auth.uid(), to_jsonb(old));
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['field_logs','labor_entries','equipment_entries','material_entries','evidence_photos'] loop
    execute format('create trigger audit_%1$s before update on public.%1$I for each row execute function public.audit_entry_update()', t);
  end loop;
end $$;

-- seed scenario
create or replace function public.seed_winter_scenario(_org uuid, _user uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare inc uuid; base timestamptz := date_trunc('day', now()) - interval '5 days' + interval '4 hours';
begin
  insert into incidents(organization_id,name,incident_type,status,fema_declaration,operational_period,started_at,created_by)
  values (_org,'Winter Storm Uri-Style Freeze Response','freeze','recovery','DR-4586','OP-3 (0600–1800)', base, _user) returning id into inc;

  insert into field_logs(organization_id,incident_id,client_generated_id,entry_time,original_timestamp,department,category,location_address,gps_lat,gps_lng,fema_category,notes,author_name,created_by) values
  (_org,inc,'seed-'||inc||'-n1',base,base,'Public Works','Operational Decision','EOC, 100 Main St',32.7767,-96.7970,'B','EOC activated to Level 2. NWS forecasts 72+ hours below freezing. Pre-treatment of priority routes authorized.','J. Ramirez, EOC Commander',_user),
  (_org,inc,'seed-'||inc||'-n2',base+interval '2 hours',base+interval '2 hours','Public Works','Utility/Road Closure','Elm St Overpass',32.7801,-96.8003,'C','Elm St overpass closed due to black ice. Barricades placed both directions; detour via 3rd Ave.','D. Chen, PW Supervisor',_user),
  (_org,inc,'seed-'||inc||'-n3',base+interval '5 hours',base+interval '5 hours','Parks','Resident Assist','Lakeside Rec Center',32.7710,-96.7889,'B','Lakeside Rec Center opened as warming center. Capacity 120. Cots and blankets staged.','M. Okafor, Parks Director',_user),
  (_org,inc,'seed-'||inc||'-n4',base+interval '9 hours',base+interval '9 hours','Utilities','Hazard Report','Water Treatment Plant #2',32.7655,-96.8120,'F','Pump station pressure dropping; intake partially frozen. Generators requested.','A. Patel, Utilities Ops',_user),
  (_org,inc,'seed-'||inc||'-n5',base+interval '14 hours',base+interval '14 hours','Library','Resident Assist','Central Library',32.7790,-96.7950,'B','Central Library opened as secondary warming site with device charging. 46 residents overnight.','K. Liu, Library Manager',_user),
  (_org,inc,'seed-'||inc||'-n6',base+interval '1 day',base+interval '1 day','Fire','Hazard Report','2200 block Oak Ln',32.7850,-96.7800,'B','Two residential fires linked to improper space heater use. Public safety messaging issued.','Capt. R. Diaz, Fire',_user),
  (_org,inc,'seed-'||inc||'-n7',base+interval '1 day 6 hours',base+interval '1 day 6 hours','Utilities','Operational Decision','Citywide',32.7767,-96.7970,'F','Boil-water notice issued citywide after pressure loss below 20 psi.','J. Ramirez, EOC Commander',_user),
  (_org,inc,'seed-'||inc||'-n8',base+interval '2 days',base+interval '2 days','Public Works','Mutual Aid','County Yard',32.7600,-96.7700,'B','County mutual aid: 3 plow trucks and 6 operators received under regional MOU.','D. Chen, PW Supervisor',_user),
  (_org,inc,'seed-'||inc||'-n9',base+interval '3 days',base+interval '3 days','Parks','Hazard Report','Riverside Park',32.7700,-96.8200,'A','Ice-loaded tree limbs down across trails and two park roads. Debris crews assigned.','M. Okafor, Parks Director',_user),
  (_org,inc,'seed-'||inc||'-n10',base+interval '4 days',base+interval '4 days','Police','Operational Decision','EOC',32.7767,-96.7970,'B','Transitioned to Recovery. Warming centers demobilized; Lakeside remains on standby.','J. Ramirez, EOC Commander',_user);

  insert into labor_entries(organization_id,incident_id,client_generated_id,entry_time,original_timestamp,staff_name,role_title,department,fema_category,regular_hours,overtime_hours,hourly_rate,fringe_pct,task_description,author_name,created_by) values
  (_org,inc,'seed-'||inc||'-l1',base,base,'Marcus Bell','Equipment Operator II','Public Works','B',8,6,31.50,32,'Salt spreading on priority routes','D. Chen',_user),
  (_org,inc,'seed-'||inc||'-l2',base,base,'Tina Alvarez','Equipment Operator I','Public Works','B',8,8,28.25,32,'Plowing and sanding arterials','D. Chen',_user),
  (_org,inc,'seed-'||inc||'-l3',base+interval '5 hours',base+interval '5 hours','Jordan Park','Recreation Supervisor','Parks','B',8,4,27.00,30,'Warming center operations — Lakeside','M. Okafor',_user),
  (_org,inc,'seed-'||inc||'-l4',base+interval '5 hours',base+interval '5 hours','Sam Whitaker','Recreation Aide','Parks','B',8,6,19.50,22,'Warming center overnight staffing','M. Okafor',_user),
  (_org,inc,'seed-'||inc||'-l5',base+interval '14 hours',base+interval '14 hours','Priya Nair','Librarian III','Library','B',8,5,30.00,30,'Central Library warming site lead','K. Liu',_user),
  (_org,inc,'seed-'||inc||'-l6',base+interval '9 hours',base+interval '9 hours','Luis Ortega','Plant Operator','Utilities','F',8,10,34.75,33,'Pump station freeze mitigation','A. Patel',_user),
  (_org,inc,'seed-'||inc||'-l7',base+interval '3 days',base+interval '3 days','Dana Brooks','Arborist','Parks','A',8,2,29.00,30,'Tree debris removal Riverside Park','M. Okafor',_user);

  insert into equipment_entries(organization_id,incident_id,client_generated_id,entry_time,original_timestamp,equipment_name,fema_code,operator_name,department,fema_category,active_hours,standby_hours,hourly_rate,work_location) values
  (_org,inc,'seed-'||inc||'-e1',base,base,'Salt Spreader Truck #12','8530','Marcus Bell','Public Works','B',14,2,62.00,'Priority Route 1'),
  (_org,inc,'seed-'||inc||'-e2',base,base,'Salt Spreader Truck #14','8530','Tina Alvarez','Public Works','B',16,0,62.00,'Priority Route 2'),
  (_org,inc,'seed-'||inc||'-e3',base+interval '1 day',base+interval '1 day','Motor Grader w/ Plow','8170','Marcus Bell','Public Works','B',10,4,98.00,'Arterials North'),
  (_org,inc,'seed-'||inc||'-e4',base+interval '9 hours',base+interval '9 hours','Generator 150kW','8241','Luis Ortega','Utilities','F',36,12,45.50,'Water Treatment Plant #2'),
  (_org,inc,'seed-'||inc||'-e5',base+interval '3 days',base+interval '3 days','Skid Steer','8390','Dana Brooks','Parks','A',9,1,38.00,'Riverside Park');
  update equipment_entries set author_name='D. Chen', created_by=_user where incident_id=inc;

  insert into material_entries(organization_id,incident_id,client_generated_id,entry_time,original_timestamp,vendor,item_description,department,quantity,unit_cost,fema_category,author_name,created_by) values
  (_org,inc,'seed-'||inc||'-m1',base,base,'Compass Minerals','Road salt (tons)','Public Works',120,84.50,'B','D. Chen',_user),
  (_org,inc,'seed-'||inc||'-m2',base+interval '5 hours',base+interval '5 hours','Costco Business','Cots, blankets, water','Parks',1,3420.00,'B','M. Okafor',_user),
  (_org,inc,'seed-'||inc||'-m3',base+interval '9 hours',base+interval '9 hours','Sunbelt Rentals','Diesel fuel (gal)','Utilities',600,4.15,'F','A. Patel',_user);

  insert into aar_reports(organization_id,incident_id,executive_summary,corrective_actions) values
  (_org,inc,'From Day 1 through Day 5, the city responded to a prolonged arctic freeze with sustained sub-freezing temperatures, widespread road icing, and loss of water pressure. The EOC activated at Level 2, opened two warming centers serving over 160 residents, maintained priority route treatment, and coordinated county mutual aid. No storm-related fatalities were recorded.',
  '[{"type":"Strength","item":"Warming centers opened within 5 hours of activation","owner":"Parks Director","target":""},{"type":"Gap","item":"Generator pre-staging at water plants was insufficient","owner":"Utilities Ops","target":"2027-10-01","action":"Pre-position two 150kW generators before freeze season"},{"type":"Gap","item":"Boil-water notice reached residents late via SMS","owner":"PIO","target":"2027-06-30","action":"Enroll residents in emergency alert system"}]'::jsonb);
  return inc;
end $$;
revoke execute on function public.seed_winter_scenario(uuid, uuid) from public, anon, authenticated;

create or replace function public.register_city(_name text, _slug text, _state text, _full_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare org uuid; d text;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  insert into organizations(name, slug, state) values (_name, lower(_slug), _state) returning id into org;
  insert into organization_members(organization_id,user_id,email,full_name,role) values (org, auth.uid(), auth.jwt()->>'email', _full_name, 'city_admin');
  foreach d in array array['Public Works','Fire','Police','Parks','Library','Utilities'] loop
    insert into departments(organization_id,name) values (org,d);
  end loop;
  insert into rate_cards(organization_id,kind,name,code,hourly_rate,fringe_pct) values
   (org,'labor','Equipment Operator',null,30,32),(org,'labor','Laborer',null,24,30),(org,'labor','Supervisor',null,38,32),
   (org,'equipment','Salt Spreader Truck','8530',62,0),(org,'equipment','Skid Steer','8390',38,0),(org,'equipment','Generator 150kW','8241',45.5,0),(org,'equipment','Bucket Truck','8160',74,0);
  perform seed_winter_scenario(org, auth.uid());
  return org;
end $$;
grant execute on function public.register_city(text,text,text,text) to authenticated;

create or replace function public.join_city(_code text, _full_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare org uuid;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select id into org from organizations where join_code = upper(trim(_code)) and not is_demo;
  if org is null then raise exception 'Invalid join code'; end if;
  insert into organization_members(organization_id,user_id,email,full_name,role) values (org, auth.uid(), auth.jwt()->>'email', _full_name, 'field_responder')
  on conflict (organization_id,user_id) do nothing;
  return org;
end $$;
grant execute on function public.join_city(text,text) to authenticated;

-- demo city
do $$ declare org uuid; begin
  insert into organizations(name,slug,state,is_demo,primary_color) values ('Riverbend (Demo)','demo','TX',true,'#D97706') returning id into org;
  insert into departments(organization_id,name) select org, unnest(array['Public Works','Fire','Police','Parks','Library','Utilities']);
  perform public.seed_winter_scenario(org, null);
end $$;

-- storage policies (bucket created separately)
create policy "members read evidence" on storage.objects for select to authenticated using (bucket_id='incident-evidence' and public.is_org_member(((storage.foldername(name))[1])::uuid));
create policy "members upload evidence" on storage.objects for insert to authenticated with check (bucket_id='incident-evidence' and public.has_org_role(((storage.foldername(name))[1])::uuid, array['city_admin','eoc_commander','field_responder']::public.org_role[]));
