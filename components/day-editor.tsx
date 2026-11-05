'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { validateDay, type DayEntry } from '@/lib/day-edit'
import { localDate, type Punch } from '@/lib/payroll'
const labels={debut:'Entrée',pause:'Pause',retour:'Retour',sortie:'Sortie'}
export default function DayEditor({employeeId,date,punches,details,onSaved,onCancel}:{employeeId:string;date:string;punches:Punch[];details:{is_holiday:boolean;note:string}|null;onSaved:()=>Promise<void>;onCancel:()=>void}){
 const [entries,setEntries]=useState<DayEntry[]>(()=>punches.map(p=>({event_type:p.event_type,time:new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Algiers',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(p.event_at))})))
 const [original]=useState(()=>punches.map(p=>({id:p.id,event_type:p.event_type,event_at:p.event_at})))
 const [holiday,setHoliday]=useState(details?.is_holiday??false),[note,setNote]=useState(details?.note??'')
 const [originalDetails]=useState(details)
 const [reason,setReason]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('')
 async function save(){
  const current=date===localDate();
  const invalid=validateDay(entries,{allowOpen:current,maxTime:current?new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Algiers',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date()):undefined});if(invalid){setError(invalid);return}
  if(!reason.trim()){setError('Indiquez le motif de la correction.');return}
  if(!entries.length&&!window.confirm('Enregistrer cette journée sans pointage ? Les heures et la paie seront recalculées.'))return
  setBusy(true);setError('')
  try{const {error}=await createClient().rpc('correct_attendance_day',{p_employee_id:employeeId,p_date:date,p_entries:entries,p_expected:original,p_reason:reason.trim(),p_is_holiday:holiday,p_note:note.trim(),p_expected_details:originalDetails});if(error)throw error;await onSaved()}
  catch(e){const message=(e as {message?:string})?.message??'';setError(message.includes('correct_attendance_day')?'Installez supabase/attendance-corrections.sql dans Supabase SQL Editor pour activer les corrections.':message||'Correction impossible. Réessayez.')}finally{setBusy(false)}
 }
 return <section className="mt-6 rounded-xl border bg-gray-50 p-5"><h2 className="font-semibold">Corriger le {date}</h2><p className="mt-2 text-xs text-gray-500">Heure d’Algérie. La journée actuelle peut rester ouverte sans sortie. La correction met à jour les heures, les exports et la paie.</p><fieldset disabled={busy} className="mt-4 space-y-3">{entries.map((e,i)=><div key={i} className="flex flex-wrap gap-2"><select aria-label={`Action ${i+1}`} className="rounded-lg border bg-white p-2" value={e.event_type} onChange={v=>setEntries(entries.map((row,j)=>j===i?{...row,event_type:v.target.value as DayEntry['event_type']}:row))}>{Object.entries(labels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select><input type="time" aria-label={`Heure ${i+1}`} className="rounded-lg border p-2" value={e.time} onChange={v=>setEntries(entries.map((row,j)=>j===i?{...row,time:v.target.value}:row))}/><Button variant="outline" onClick={()=>setEntries(entries.filter((_,j)=>j!==i))}>Retirer</Button></div>)}<Button variant="outline" onClick={()=>setEntries([...entries,{event_type:entries.length?'sortie':'debut',time:''}])}>Ajouter un pointage</Button><div className="rounded-lg border bg-white p-4"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={holiday} onChange={e=>setHoliday(e.target.checked)}/>Jour férié</label><label className="mt-4 block text-sm">Note sur la journée<textarea maxLength={1000} value={note} onChange={e=>setNote(e.target.value)} placeholder="Nom du jour férié ou autre précision…" className="mt-2 w-full rounded-lg border p-3"/></label><p className="text-xs text-gray-500">Cette indication est informative et ne modifie pas le calcul de la paie.</p></div><label className="block text-sm">Motif de la correction<textarea maxLength={500} value={reason} onChange={e=>setReason(e.target.value)} className="mt-2 w-full rounded-lg border bg-white p-3"/></label>{error&&<p role="alert" className="text-sm text-red-700">{error}</p>}<div className="flex gap-3"><Button onClick={save}>{busy?'Enregistrement…':'Enregistrer la correction'}</Button><Button variant="outline" onClick={onCancel}>Annuler</Button></div></fieldset></section>
}
