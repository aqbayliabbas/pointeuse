-- Update existing installations to Algerian local time. Run after schema.sql.
-- Install after schema.sql. Does not change existing attendance.
begin;
create table if not exists public.attendance_corrections (
 id uuid primary key default gen_random_uuid(), employee_id uuid not null references public.employees(id),
 work_date date not null, actor_id uuid not null, reason text not null,
 before_events jsonb not null, after_events jsonb not null, corrected_at timestamptz not null default now()
);
alter table public.attendance_corrections enable row level security;
revoke all on public.attendance_corrections from anon, authenticated;
grant select on public.attendance_corrections to authenticated;
drop policy if exists corrections_admin_read on public.attendance_corrections;
create policy corrections_admin_read on public.attendance_corrections for select to authenticated using(public.is_admin());

create table if not exists public.attendance_day_details (
 employee_id uuid not null references public.employees(id), work_date date not null,
 is_holiday boolean not null default false, note text not null default '' check(length(note)<=1000),
 primary key(employee_id,work_date)
);
alter table public.attendance_day_details enable row level security;
revoke all on public.attendance_day_details from anon, authenticated;
grant select on public.attendance_day_details to authenticated;
drop policy if exists day_details_admin_read on public.attendance_day_details;
create policy day_details_admin_read on public.attendance_day_details for select to authenticated using(public.is_admin());
alter table public.attendance_corrections add column if not exists before_details jsonb;
alter table public.attendance_corrections add column if not exists after_details jsonb;
drop function if exists public.correct_attendance_day(uuid,date,jsonb,jsonb,text);

create or replace function public.correct_attendance_day(p_employee_id uuid,p_date date,p_entries jsonb,p_expected jsonb,p_reason text,p_is_holiday boolean default false,p_note text default '',p_expected_details jsonb default null)
returns void language plpgsql security definer set search_path='' as $$
declare old_details jsonb; new_details jsonb; original jsonb; expected jsonb; saved jsonb; entry jsonb; previous_type text := null; previous_time text := ''; event_time timestamptz; valid boolean;
begin
 if not public.is_admin() or auth.uid() is null then raise exception 'Accès refusé'; end if;
 if p_date is null or p_date > (now() at time zone 'Africa/Algiers')::date then raise exception 'Choisissez aujourd’hui ou une journée passée'; end if;
 if p_reason is null or length(trim(p_reason))=0 or length(p_reason)>500 then raise exception 'Motif de correction requis (500 caractères maximum)'; end if;
 if jsonb_typeof(p_entries) is distinct from 'array' or jsonb_typeof(p_expected) is distinct from 'array' then raise exception 'Pointages invalides'; end if;
 if jsonb_array_length(p_entries)>100 then raise exception 'Trop de pointages'; end if;
 perform 1 from public.employees where id=p_employee_id and start_date<=p_date and (end_date is null or end_date>=p_date) for update;
 if not found then raise exception 'Employée introuvable pour cette date'; end if;
 if p_is_holiday is null or p_note is null or length(p_note)>1000 then raise exception 'Note invalide (1000 caractères maximum)'; end if;
 select jsonb_build_object('is_holiday',is_holiday,'note',note) into old_details from public.attendance_day_details where employee_id=p_employee_id and work_date=p_date;
 if old_details is distinct from p_expected_details then raise exception 'La note de cette journée a changé. Annulez puis rechargez la page.'; end if;
 new_details:=jsonb_build_object('is_holiday',p_is_holiday,'note',trim(p_note));
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'event_type',event_type,'event_at',event_at) order by id),'[]'::jsonb) into original
 from public.attendance_events where employee_id=p_employee_id and (event_at at time zone 'Africa/Algiers')::date=p_date;
 select coalesce(jsonb_agg(jsonb_build_object('id',x.id,'event_type',x.event_type,'event_at',x.event_at) order by x.id),'[]'::jsonb) into expected
 from jsonb_to_recordset(p_expected) as x(id uuid,event_type text,event_at timestamptz);
 if original<>expected then raise exception 'Cette journée a changé. Annulez puis rechargez la page avant de corriger.'; end if;
 -- Validate every entry before replacing anything. An empty array clears a day.
 for entry in select value from jsonb_array_elements(p_entries) loop
 if coalesce(entry->>'time','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or entry->>'time'<=previous_time then raise exception 'Les heures doivent être valides et strictement croissantes'; end if;
 valid := (previous_type is null and entry->>'event_type'='debut') or (previous_type in ('debut','retour') and entry->>'event_type' in ('pause','sortie')) or (previous_type='pause' and entry->>'event_type' in ('retour','sortie'));
 if valid is distinct from true then raise exception 'Ordre des pointages invalide'; end if;
 event_time := (p_date + (entry->>'time')::time) at time zone 'Africa/Algiers';
 if event_time>clock_timestamp() then raise exception 'Un pointage ne peut pas être situé dans le futur'; end if;
 if to_char(event_time at time zone 'Africa/Algiers','HH24:MI')<>entry->>'time' then raise exception 'Heure inexistante lors du changement horaire'; end if;
 previous_type:=entry->>'event_type'; previous_time:=entry->>'time';
 end loop;
 if p_date < (now() at time zone 'Africa/Algiers')::date and jsonb_array_length(p_entries)>0 and previous_type<>'sortie' then raise exception 'Une sortie est requise'; end if;
 delete from public.attendance_events where employee_id=p_employee_id and (event_at at time zone 'Africa/Algiers')::date=p_date;
 insert into public.attendance_events(employee_id,event_type,event_at)
 select p_employee_id, e->>'event_type', (p_date + (e->>'time')::time) at time zone 'Africa/Algiers' from jsonb_array_elements(p_entries) as e;
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'event_type',event_type,'event_at',event_at) order by event_at),'[]'::jsonb) into saved
 from public.attendance_events where employee_id=p_employee_id and (event_at at time zone 'Africa/Algiers')::date=p_date;
 insert into public.attendance_day_details(employee_id,work_date,is_holiday,note) values(p_employee_id,p_date,p_is_holiday,trim(p_note))
 on conflict(employee_id,work_date) do update set is_holiday=excluded.is_holiday,note=excluded.note;
 insert into public.attendance_corrections(employee_id,work_date,actor_id,reason,before_events,after_events,before_details,after_details) values(p_employee_id,p_date,auth.uid(),trim(p_reason),original,saved,old_details,new_details);
end $$;
revoke all on function public.correct_attendance_day(uuid,date,jsonb,jsonb,text,boolean,text,jsonb) from public,anon;
grant execute on function public.correct_attendance_day(uuid,date,jsonb,jsonb,text,boolean,text,jsonb) to authenticated;
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
