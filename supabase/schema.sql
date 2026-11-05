-- Run once in Supabase SQL Editor. No employee data is deleted.
begin;
create table if not exists public.employees (
 id uuid primary key default gen_random_uuid(),
 full_name text not null,
 role text,
 active boolean not null default true
);
alter table public.employees add column if not exists monthly_salary numeric(12,2) not null default 0 check (monthly_salary >= 0);
alter table public.employees add column if not exists schedule jsonb not null default '[]';
alter table public.employees add column if not exists start_date date not null default current_date;
alter table public.employees add column if not exists end_date date;
create table if not exists public.attendance_events (
 id uuid primary key default gen_random_uuid(),
 employee_id uuid not null references public.employees(id) on delete restrict,
 event_type text not null check(event_type in ('debut','pause','retour','sortie')),
 event_at timestamptz not null default now()
);
create index if not exists attendance_employee_time on public.attendance_events(employee_id, event_at);
create index if not exists attendance_time on public.attendance_events(event_at);
create or replace function public.is_admin() returns boolean language sql stable set search_path = '' as $$
 select coalesce(auth.jwt()->'app_metadata'->>'role', '') = 'admin';
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;
alter table public.employees enable row level security;
alter table public.attendance_events enable row level security;
-- Replace previous prototype policies on these two tables only.
do $$ declare p record; begin
 for p in select schemaname, tablename, policyname from pg_policies where schemaname='public' and tablename in ('employees','attendance_events') loop
 execute format('drop policy %I on %I.%I', p.policyname,p.schemaname,p.tablename);
 end loop;
end $$;
revoke all on public.employees, public.attendance_events from anon, authenticated;
grant select, insert, update on public.employees to authenticated;
grant select on public.attendance_events to authenticated;
create policy employees_admin on public.employees for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy attendance_admin_read on public.attendance_events for select to authenticated using(public.is_admin());
create or replace function public.validate_employee() returns trigger language plpgsql set search_path='' as $$
declare s jsonb;
begin
 if length(trim(new.full_name))=0 or new.monthly_salary < 0 or new.monthly_salary is null then raise exception 'Nom et salaire valides requis'; end if;
 if jsonb_typeof(new.schedule) <> 'array' or jsonb_array_length(new.schedule) <> 7 then raise exception 'Calendrier de 7 jours requis'; end if;
 for s in select * from jsonb_array_elements(new.schedule) loop
 if jsonb_typeof(s->'enabled') is distinct from 'boolean' then raise exception 'Jour invalide'; end if;
 if (s->>'enabled')::boolean then
 if coalesce(s->>'start','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or coalesce(s->>'end','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or s->>'end' <= s->>'start' then raise exception 'Horaires invalides'; end if;
 end if;
 end loop;
 if new.end_date < new.start_date then raise exception 'Date de fin invalide'; end if;
 return new;
end $$;
drop trigger if exists validate_employee on public.employees;
create trigger validate_employee before insert or update on public.employees for each row execute function public.validate_employee();
create or replace function public.record_punch(p_employee_id uuid, p_event_type text) returns public.attendance_events
language plpgsql security definer set search_path = '' as $$
declare last_type text; result public.attendance_events; today date := (now() at time zone 'Africa/Algiers')::date;
begin
 if not public.is_admin() then raise exception 'Accès refusé'; end if;
 -- Lock the employee to serialize simultaneous punches.
 perform 1 from public.employees where id=p_employee_id and active and start_date<=today and (end_date is null or end_date>=today) for update;
 if not found then raise exception 'Employée inactive ou introuvable'; end if;
 select event_type into last_type from public.attendance_events where employee_id=p_employee_id and (event_at at time zone 'Africa/Algiers')::date=today order by event_at desc limit 1;
 if not ((last_type is null and p_event_type='debut') or (last_type in ('debut','retour') and p_event_type in ('pause','sortie')) or (last_type='pause' and p_event_type in ('retour','sortie'))) or p_event_type not in ('debut','pause','retour','sortie') or p_event_type is null then
 raise exception 'Action incompatible avec le dernier pointage';
 end if;
 -- SQL NULL must not bypass transition validation.
 if last_type is null and p_event_type<>'debut' then raise exception 'Commencez par le début de journée'; end if;
 insert into public.attendance_events(employee_id,event_type,event_at) values(p_employee_id,p_event_type,clock_timestamp()) returning * into result;
 return result;
end $$;
revoke all on function public.record_punch(uuid,text) from public, anon;
grant execute on function public.record_punch(uuid,text) to authenticated;
commit;
