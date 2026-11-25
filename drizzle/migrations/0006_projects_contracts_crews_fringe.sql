create table public.incident_projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  incident_id uuid not null references public.incidents(id) on delete cascade,
  name text not null,
  project_number text,
  fema_category public.fema_category,
  facility text,
  gps_lat double precision,
  gps_lng double precision,
  notes text,
  created_at timestamptz not null default now()
);
create index incident_projects_incident_idx on public.incident_projects(incident_id);
grant select on public.incident_projects to anon;
grant select, insert, update, delete on public.incident_projects to authenticated;
grant all on public.incident_projects to service_role;
alter table public.incident_projects enable row level security;
create policy "read projects" on public.incident_projects for select to anon, authenticated using (public.can_read_org(organization_id));
create policy "command writes projects" on public.incident_projects for all to authenticated
  using (public.has_org_role(organization_id, array['city_admin','eoc_commander']::public.org_role[]))
  with check (public.has_org_role(organization_id, array['city_admin','eoc_commander']::public.org_role[]) and exists (select 1 from public.incidents i where i.id = incident_id and i.organization_id = incident_projects.organization_id));
create policy "demo insert incident_projects" on public.incident_projects for insert to anon, authenticated with check (public.is_demo_org(organization_id));
create policy "demo update incident_projects" on public.incident_projects for update to anon, authenticated using (public.is_demo_org(organization_id)) with check (public.is_demo_org(organization_id));
create policy "demo delete incident_projects" on public.incident_projects for delete to anon, authenticated using (public.is_demo_org(organization_id));

create table public.contract_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  incident_id uuid not null references public.incidents(id) on delete cascade,
  client_generated_id text not null,
  entry_time timestamptz not null default now(),
  original_timestamp timestamptz not null default now(),
  timestamp_edited boolean not null default false,
  kind text not null default 'contractor' check (kind in ('contractor','rental','mutual_aid')),
  vendor text not null,
  contract_number text,
  po_number text,
  ticket_number text,
  procurement_method text,
  description text not null,
  department text,
  fema_category public.fema_category not null default 'B',
  quantity numeric(12,2) not null default 1,
  unit text,
  unit_cost numeric(12,2) not null default 0,
  total_cost numeric(14,2) generated always as (round(quantity * unit_cost, 2)) stored,
  invoice_path text,
  rate_verified boolean not null default false,
  author_name text,
  created_by uuid,
  created_at timestamptz not null default now(),
  edited_by uuid, edited_at timestamptz,
  review_status text not null default 'pending' check (review_status in ('pending','approved','rejected')),
  reviewed_by uuid, reviewed_at timestamptz, review_note text,
  unique (organization_id, client_generated_id)
);
create index contract_entries_incident_idx on public.contract_entries(incident_id);
grant select on public.contract_entries to anon;
grant select, insert, update, delete on public.contract_entries to authenticated;
grant all on public.contract_entries to service_role;
alter table public.contract_entries enable row level security;
create policy "read contract_entries" on public.contract_entries for select to anon, authenticated using (public.can_read_org(organization_id));
create policy "insert contract_entries" on public.contract_entries for insert to authenticated with check (created_by = auth.uid() and public.has_org_role(organization_id, array['city_admin','eoc_commander','field_responder']::public.org_role[]) and exists (select 1 from public.incidents i where i.id = incident_id and i.organization_id = contract_entries.organization_id));
create policy "update contract_entries" on public.contract_entries for update to authenticated using ((created_by = auth.uid() and public.is_org_member(organization_id)) or public.has_org_role(organization_id, array['city_admin','eoc_commander','finance_auditor']::public.org_role[])) with check (public.is_org_member(organization_id));
create policy "delete contract_entries" on public.contract_entries for delete to authenticated using (public.has_org_role(organization_id, array['city_admin','eoc_commander']::public.org_role[]));
create policy "demo insert contract_entries" on public.contract_entries for insert to anon, authenticated with check (public.is_demo_org(organization_id));
create policy "demo update contract_entries" on public.contract_entries for update to anon, authenticated using (public.is_demo_org(organization_id)) with check (public.is_demo_org(organization_id));
create policy "demo delete contract_entries" on public.contract_entries for delete to anon, authenticated using (public.is_demo_org(organization_id));
create trigger aa_guard_review_contract_entries before insert or update or delete on public.contract_entries for each row execute function public.guard_entry_review();
create trigger audit_contract_entries before update on public.contract_entries for each row execute function public.audit_entry_update();

alter table public.field_logs add column project_id uuid references public.incident_projects(id) on delete set null;
alter table public.labor_entries add column project_id uuid references public.incident_projects(id) on delete set null,
  add column crew_ticket_id text, add column mutual_aid_agency text;
alter table public.equipment_entries add column project_id uuid references public.incident_projects(id) on delete set null,
  add column crew_ticket_id text;
alter table public.material_entries add column project_id uuid references public.incident_projects(id) on delete set null;
alter table public.contract_entries add column project_id uuid references public.incident_projects(id) on delete set null;

alter table public.departments
  add column fica_pct numeric(6,2) not null default 0,
  add column retirement_pct numeric(6,2) not null default 0,
  add column medical_pct numeric(6,2) not null default 0,
  add column workers_comp_pct numeric(6,2) not null default 0,
  add column other_fringe_pct numeric(6,2) not null default 0;

create or replace function public.seed_demo_extras(_org uuid) returns void
language plpgsql security definer set search_path = public as $$
declare inc uuid;
begin
  update departments set fica_pct = 7.65, retirement_pct = case name when 'Fire' then 24 when 'Police' then 22 else 12 end,
    medical_pct = 9, workers_comp_pct = case name when 'Public Works' then 4.5 when 'Fire' then 6 else 2 end
  where organization_id = _org;
  select id into inc from incidents where organization_id = _org order by started_at desc limit 1;
  if inc is null then return; end if;
  insert into incident_projects(organization_id, incident_id, name, project_number, fema_category, facility, gps_lat, gps_lng) values
    (_org, inc, 'Citywide road treatment & debris', 'PW-1', 'B', 'Arterial road network', 30.2672, -97.7431),
    (_org, inc, 'Civic Center warming center', 'PW-2', 'B', 'Riverbend Civic Center', 30.2700, -97.7400),
    (_org, inc, 'Main St water main repair', 'PW-3', 'F', 'Main St & 4th', 30.2650, -97.7460);
end $$;
revoke execute on function public.seed_demo_extras(uuid) from public, anon, authenticated;

create or replace function public.reset_demo_city() returns void
language plpgsql security definer set search_path = public as $$
declare org uuid;
begin
  select id into org from organizations where is_demo limit 1;
  if org is null then return; end if;
  delete from evidence_photos where organization_id=org;
  delete from field_logs where organization_id=org;
  delete from labor_entries where organization_id=org;
  delete from equipment_entries where organization_id=org;
  delete from material_entries where organization_id=org;
  delete from contract_entries where organization_id=org;
  delete from incident_projects where organization_id=org;
  delete from aar_reports where organization_id=org;
  delete from incidents where organization_id=org;
  delete from record_edits where organization_id=org;
  delete from city_fleet_assets where organization_id=org;
  delete from rate_cards where organization_id=org;
  delete from fema_equipment_rates where organization_id=org;
  delete from departments where organization_id=org;
  insert into departments(organization_id,name) select org, unnest(array['Public Works','Fire','Police','Parks','Library','Utilities']);
  perform seed_winter_scenario(org, null);
  insert into city_fleet_assets(organization_id,asset_number,nickname,department_id,fema_rate_id,rate_source)
  select org, s.asset_number, s.nickname,
    (select id from departments d where d.organization_id=org and d.name=s.department_name limit 1),
    (select id from fema_equipment_rates r where r.organization_id is null and r.cost_code=s.cost_code limit 1),
    s.rate_source
  from demo_fleet_seed s;
  perform seed_demo_extras(org);
end $$;
revoke execute on function public.reset_demo_city() from public, anon, authenticated;