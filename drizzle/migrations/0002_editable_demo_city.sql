do $$
declare t text;
begin
  foreach t in array array['field_logs','labor_entries','equipment_entries','material_entries','evidence_photos','incidents','aar_reports','departments','rate_cards','city_fleet_assets'] loop
    execute format('grant insert, update, delete on public.%1$I to anon', t);
    execute format('create policy "demo insert %1$s" on public.%1$I for insert to anon, authenticated with check (public.is_demo_org(organization_id))', t);
    execute format('create policy "demo update %1$s" on public.%1$I for update to anon, authenticated using (public.is_demo_org(organization_id)) with check (public.is_demo_org(organization_id))', t);
    execute format('create policy "demo delete %1$s" on public.%1$I for delete to anon, authenticated using (public.is_demo_org(organization_id))', t);
  end loop;
end $$;

grant select on public.record_edits to anon;
create policy "demo read edits" on public.record_edits for select to anon, authenticated using (public.is_demo_org(organization_id));

create policy "demo read evidence" on storage.objects for select to anon, authenticated
  using (bucket_id='incident-evidence' and public.is_demo_org(((storage.foldername(name))[1])::uuid));
create policy "demo upload evidence" on storage.objects for insert to anon, authenticated
  with check (bucket_id='incident-evidence' and public.is_demo_org(((storage.foldername(name))[1])::uuid));
create policy "demo update evidence" on storage.objects for update to anon, authenticated
  using (bucket_id='incident-evidence' and public.is_demo_org(((storage.foldername(name))[1])::uuid));

create table public.demo_fleet_seed (
  asset_number text not null,
  nickname text not null,
  department_name text,
  cost_code text,
  rate_source public.rate_source not null default 'fema_schedule'
);
grant all on public.demo_fleet_seed to service_role;
alter table public.demo_fleet_seed enable row level security;
insert into public.demo_fleet_seed(asset_number,nickname,department_name,cost_code,rate_source)
select f.asset_number, f.nickname, d.name, r.cost_code, f.rate_source
from public.city_fleet_assets f
join public.organizations o on o.id=f.organization_id and o.is_demo
left join public.departments d on d.id=f.department_id
left join public.fema_equipment_rates r on r.id=f.fema_rate_id;

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
end $$;
revoke execute on function public.reset_demo_city() from public, anon, authenticated;