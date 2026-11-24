
create type public.rate_source as enum ('fema_schedule','local_rate','unlisted_pending_fema');

create table public.fema_equipment_rates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  cost_code text not null,
  schedule_edition text not null default '2025-07-01',
  category text not null default 'Other',
  equipment_name text not null,
  specifications text,
  unit text not null default 'hour',
  hourly_rate numeric(10,2) not null default 0,
  notes text,
  created_at timestamptz not null default now()
);
comment on column public.fema_equipment_rates.organization_id is 'NULL = shared reference schedule; set = edition imported by that city';
create index fema_rates_org_idx on public.fema_equipment_rates(organization_id);
create index fema_rates_code_idx on public.fema_equipment_rates(cost_code);
grant select on public.fema_equipment_rates to anon;
grant select, insert, update, delete on public.fema_equipment_rates to authenticated;
grant all on public.fema_equipment_rates to service_role;
alter table public.fema_equipment_rates enable row level security;
create policy "read shared or own city rates" on public.fema_equipment_rates for select to anon, authenticated
  using (organization_id is null or public.can_read_org(organization_id));
create policy "admins import city rates" on public.fema_equipment_rates for insert to authenticated
  with check (organization_id is not null and public.has_org_role(organization_id, array['city_admin']::public.org_role[]));
create policy "admins delete city rates" on public.fema_equipment_rates for delete to authenticated
  using (organization_id is not null and public.has_org_role(organization_id, array['city_admin']::public.org_role[]));

create table public.city_fleet_assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  asset_number text not null,
  nickname text not null,
  department_id uuid references public.departments(id) on delete set null,
  fema_rate_id uuid references public.fema_equipment_rates(id) on delete set null,
  custom_hourly_rate numeric(10,2),
  rate_source public.rate_source not null default 'fema_schedule',
  make_model_hp text,
  justification_notes text,
  created_at timestamptz not null default now(),
  unique (organization_id, asset_number),
  constraint unlisted_needs_make_model check (rate_source <> 'unlisted_pending_fema' or coalesce(trim(make_model_hp),'') <> ''),
  constraint local_needs_rate check (rate_source <> 'local_rate' or custom_hourly_rate is not null)
);
create index fleet_org_idx on public.city_fleet_assets(organization_id);
create index fleet_dept_idx on public.city_fleet_assets(department_id);
create index fleet_rate_idx on public.city_fleet_assets(fema_rate_id);
grant select on public.city_fleet_assets to anon;
grant select, insert, update, delete on public.city_fleet_assets to authenticated;
grant all on public.city_fleet_assets to service_role;
alter table public.city_fleet_assets enable row level security;
create policy "read fleet" on public.city_fleet_assets for select to anon, authenticated using (public.can_read_org(organization_id));
create policy "admins and auditors manage fleet" on public.city_fleet_assets for all to authenticated
  using (public.has_org_role(organization_id, array['city_admin','finance_auditor']::public.org_role[]))
  with check (public.has_org_role(organization_id, array['city_admin','finance_auditor']::public.org_role[]));

alter table public.equipment_entries
  add column fema_cost_code text,
  add column schedule_edition text,
  add column rate_source text,
  add column city_fleet_asset_id uuid references public.city_fleet_assets(id) on delete set null,
  add column reimbursable_total numeric(10,2) generated always as (round(active_hours*hourly_rate, 2)) stored;
create index equip_fleet_idx on public.equipment_entries(city_fleet_asset_id);
update public.equipment_entries set fema_cost_code = fema_code, schedule_edition = '2025-07-01', rate_source = 'fema_schedule' where fema_cost_code is null;

insert into public.fema_equipment_rates (cost_code, category, equipment_name, specifications, hourly_rate, notes) values
('8720','Trucks & Hauling','Dump Truck','6 CY, Off-Highway',48.50,null),
('8721','Trucks & Hauling','Dump Truck','8–10 CY',62.00,null),
('8722','Trucks & Hauling','Dump Truck','12–16 CY',78.25,null),
('8540','Loaders & Heavy Equipment','Skid-Steer Loader','Small, up to 1,750 lb ROC',29.75,null),
('8541','Loaders & Heavy Equipment','Skid-Steer Loader','Medium, 66 HP',38.00,null),
('8393','Loaders & Heavy Equipment','Wheel Loader','3 CY Bucket',92.00,null),
('8310','Generators & Lighting','Generator','5.5 kW Portable Gas',6.25,null),
('8311','Generators & Lighting','Generator','17 kW Diesel',18.50,null),
('8312','Generators & Lighting','Generator','45 kW Diesel',35.75,null),
('8325','Generators & Lighting','Generator','40 kW Diesel',32.00,null),
('8326','Generators & Lighting','Generator','25 kW Diesel',24.50,null),
('8330','Generators & Lighting','Light Tower','Portable Diesel, 4 x 1,000 W',12.75,null),
('8187','Chainsaws & Debris','Chainsaw','20" Bar, Heavy Duty',3.25,null),
('8188','Chainsaws & Debris','Chainsaw','20" Bar, 5.0 cu in',3.75,null),
('8190','Chainsaws & Debris','Chainsaw','16" Bar, Light Duty',2.50,null),
('8192','Chainsaws & Debris','Pole Chainsaw','10" Bar, Telescoping',2.75,null),
('8200','Chainsaws & Debris','Brush Chipper','12" Capacity, 85 HP',36.50,null),
('8150','Snow & Ice','Pavement Broom','Self-Propelled, 8 ft',41.00,null),
('8472','Pumps & Water','Centrifugal Water Pump','3" Lightweight',5.50,null),
('8473','Pumps & Water','Centrifugal Water Pump','3" Heavy Duty',9.25,null),
('8496','Trucks & Hauling','Truck-Mounted Crane / Aerial Lift','Bucket Truck, 40–60 ft',74.00,null),
('8810','Snow & Ice','Salt / Sand Spreader','Truck-Mounted, 8–10 CY Hopper',14.50,'Attachment only; log the carrier truck separately'),
('8811','Snow & Ice','Snow Plow Attachment','Front-Mount, 10–12 ft Blade',11.25,'Attachment only; log the carrier truck separately'),
('8010','Public Safety & Vehicles','Pickup Truck','1/2 Ton, 4x2',16.75,null),
('8011','Public Safety & Vehicles','Pickup Truck','3/4 Ton, 4x4',22.50,null),
('8077','Public Safety & Vehicles','Fire / Command SUV','Command Vehicle, 4x4',24.00,null),
('8745','Trucks & Hauling','Vacuum / Jetter Truck','Combination Sewer Cleaner',118.00,null);
