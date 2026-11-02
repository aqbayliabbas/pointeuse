'use client'
import { useState } from 'react'
import useSWR from 'swr'
import { Button } from '@/components/ui/button'
import { AccessNotice, useAccess } from '@/components/access'
import { loadEmployees, loadPunches } from '@/lib/data'
import { days, localDate, type Punch } from '@/lib/payroll'
import { createClient } from '@/lib/supabase/client'
const labels={debut:'Début de journée',pause:'Début de pause',retour:'Retour de pause',sortie:'Sortie'}
export default function EmployeePage(){
 const {ready,message}=useAccess()
 const [selected,setSelected]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const today=localDate()
 const {data:employees=[],error:employeesError}=useSWR(ready?'employees':null,loadEmployees,{refreshInterval:30000})
 const {data:events=[],error:eventsError,isLoading,mutate}=useSWR(ready?['punches',today.slice(0,7)]:null,()=>loadPunches(today.slice(0,7)),{refreshInterval:15000})
 const active=employees.filter(e=>e.active&&e.start_date<=today)
 const employee=active.find(e=>e.id===selected)
 const punches=events.filter(e=>e.employee_id===employee?.id&&localDate(new Date(e.event_at))===today)
 const last=punches.at(-1)?.event_type
 const allowed: Punch['event_type'][]=!last?['debut']:last==='debut'||last==='retour'?['pause','sortie']:last==='pause'?['retour','sortie']:[]
 const day=new Date(today+'T12:00:00Z').getUTCDay(), shift=employee?.schedule[day]
 async function punch(action: Punch['event_type']){
  if(!employee||busy)return
  setBusy(true);setError('')
  try{const {error}=await createClient().rpc('record_punch',{p_employee_id:employee.id,p_event_type:action});if(error)throw error;await mutate()}catch{setError('Pointage refusé. Actualisez la page et vérifiez votre connexion.')}finally{setBusy(false)}
 }
 return <main className="min-h-screen bg-[#f7f7f8] p-5 text-[#191919] sm:p-10"><div className="mx-auto max-w-3xl"><header className="flex justify-between"><strong>Atelier · Pointeuse</strong><a href="/admin" className="text-sm underline">Administration</a></header><h1 className="mt-14 text-3xl font-semibold">Pointage du jour</h1><p className="mt-2 text-sm text-gray-500">{new Intl.DateTimeFormat('fr-FR',{dateStyle:'full',timeZone:'Africa/Casablanca'}).format(new Date())}</p><div className="mt-8">{!ready&&<AccessNotice message={message}/>}</div>{ready&&<section className="mt-6 rounded-3xl border bg-white p-6 sm:p-8"><label htmlFor="employee" className="text-sm font-medium">Employée</label><select id="employee" value={selected} onChange={e=>{setSelected(e.target.value);setError('')}} disabled={busy||!!employeesError} className="mt-3 w-full rounded-xl border bg-white p-4"><option value="">Sélectionner une employée</option>{active.map(e=><option value={e.id} key={e.id}>{e.full_name}</option>)}</select>{(employeesError||eventsError)&&<p role="alert" className="mt-4 text-sm text-red-700">Impossible de charger les données. Vérifiez votre configuration.</p>}{!employeesError&&active.length===0&&<p className="mt-4 text-sm text-gray-500">Aucune employée disponible.</p>}{employee&&<><p className="mt-5 text-sm text-gray-500">{days[day]} : {shift?.enabled?`${shift.start} – ${shift.end}`:'Jour de repos'}</p><div className="mt-6 grid grid-cols-2 gap-3">{(Object.keys(labels) as Punch['event_type'][]).map(action=><Button key={action} disabled={busy||isLoading||!!eventsError||!allowed.includes(action)} variant="outline" className="h-14" onClick={()=>punch(action)}>{labels[action]}</Button>)}</div><ol className="mt-8 space-y-3">{punches.map(p=><li key={p.id} className="flex justify-between border-b pb-3 text-sm"><span>{labels[p.event_type]}</span><time>{new Intl.DateTimeFormat('fr-FR',{hour:'2-digit',minute:'2-digit',timeZone:'Africa/Casablanca'}).format(new Date(p.event_at))}</time></li>)}</ol>{last==='sortie'&&<p className="mt-4 text-sm text-green-700">Journée terminée.</p>}</>}{error&&<p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}</section>}</div></main>
}
