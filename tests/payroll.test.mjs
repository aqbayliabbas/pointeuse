import test from 'node:test'
import assert from 'node:assert/strict'
import { payroll, emptySchedule, localDate } from '../lib/payroll.ts'
const schedule=emptySchedule();schedule[1]={enabled:true,start:'09:00',end:'17:00'}
const employee={id:'e',full_name:'Test',role:null,monthly_salary:4000,schedule,start_date:'2026-11-01',end_date:null,active:true}
function stamp(time,day) {
 const base=new Date('2026-11-'+day+'T'+time+':00Z')
 const offset=new Intl.DateTimeFormat('en',{timeZone:'Africa/Algiers',timeZoneName:'shortOffset'}).formatToParts(base).find(p=>p.type==='timeZoneName').value
 const hours=Number(offset.replace('GMT','')||0)
 return new Date(base.getTime()-hours*3600000).toISOString()
}
const punch=(type,time,day='02')=>({id:type+time,employee_id:'e',event_type:type,event_at:stamp(time,day)})
const calc=(events,today='2026-12-01',person=employee)=>payroll(person,events,'2026-11',today)
test('full month pays full salary',()=>{const events=['02','09','16','23','30'].flatMap(day=>[punch('debut','09:00',day),punch('sortie','17:00',day)]);assert.equal(calc(events).amount,4000);assert.equal(calc(events).absenceDays,0)})
test('absence reduces salary and counts past scheduled days',()=>{const r=calc([punch('debut','09:00'),punch('sortie','17:00')]);assert.equal(r.amount,800);assert.equal(r.absenceDays,4);assert.equal(r.missing,1920)})
test('breaks and late arrivals are unpaid',()=>{const r=calc([punch('debut','10:00'),punch('pause','12:00'),punch('retour','13:00'),punch('sortie','17:00')]);assert.equal(r.worked,360);assert.equal(r.amount,600)})
test('outside schedule is capped and rest days excluded',()=>{const r=calc([punch('debut','07:00'),punch('sortie','20:00'),punch('debut','09:00','03'),punch('sortie','17:00','03')]);assert.equal(r.worked,480)})
test('future days and current day are not absences',()=>{const r=calc([],'2026-11-02');assert.equal(r.absenceDays,0);assert.equal(r.missing,0);assert.equal(r.amount,0)})
test('unfinished day flagged without invented hours',()=>{const r=calc([punch('debut','09:00')]);assert.equal(r.incomplete,1);assert.equal(r.worked,0)})
test('zero schedule yields finite zero',()=>{const r=calc([],undefined,{...employee,schedule:emptySchedule()});assert.equal(r.amount,0);assert.equal(r.planned,0)})
test('hire mid-month prorates against full month',()=>{const r=calc([punch('debut','09:00','30'),punch('sortie','17:00','30')],undefined,{...employee,start_date:'2026-11-30'});assert.equal(r.amount,800);assert.equal(r.absenceDays,0)})
test('archived employee retains earned pay without future absence',()=>{const r=calc([punch('debut','09:00'),punch('sortie','17:00')],undefined,{...employee,active:false,end_date:'2026-11-02'});assert.equal(r.amount,800);assert.equal(r.absenceDays,0)})
test('Algerian day is independent of machine timezone',()=>{const previous=process.env.TZ; try {process.env.TZ='Pacific/Honolulu';assert.equal(localDate(new Date(stamp('00:30','02'))),'2026-11-02')} finally {if(previous)process.env.TZ=previous;else delete process.env.TZ}})
test('duplicate starts do not double count and are flagged',()=>{const r=calc([punch('debut','09:00'),punch('debut','10:00'),punch('sortie','17:00')]);assert.equal(r.worked,480);assert.equal(r.incomplete,1)})

test('Algerian timezone uses UTC+1 at midnight',()=>{assert.equal(localDate(new Date('2026-11-02T23:30:00Z')),'2026-11-03');assert.equal(new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Algiers',hour:'2-digit',minute:'2-digit'}).format(new Date('2026-11-03T07:33:00Z')),'08:33')})
