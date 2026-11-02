'use client'
import { useState, type FormEvent } from 'react'
import { days, emptySchedule, localDate, type Employee } from '@/lib/payroll'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
export default function EmployeeForm({ employee, onSaved, onCancel }: { employee?: Employee; onSaved: () => Promise<void>; onCancel: () => void }) {
 const [name,setName]=useState(employee?.full_name ?? '')
 const [role,setRole]=useState(employee?.role ?? '')
 const [salary,setSalary]=useState(String(employee?.monthly_salary ?? ''))
 const [start,setStart]=useState(employee?.start_date ?? localDate())
 const [schedule,setSchedule]=useState(employee?.schedule.length === 7 ? employee.schedule : emptySchedule())
 const [busy,setBusy]=useState(false), [error,setError]=useState('')
 async function save(event: FormEvent) {
  event.preventDefault(); if(busy) return; setError('')
  if(!name.trim() || !Number.isFinite(Number(salary)) || Number(salary)<0 || !salary) {setError('Indiquez un nom et un salaire valide.');return}
  if(!schedule.some(s=>s.enabled) || schedule.some(s=>s.enabled && (!s.start || !s.end || s.end<=s.start))) {setError('Activez au moins un jour, avec une heure de fin après le début.');return}
  setBusy(true)
  try {
   const payload={full_name:name.trim(),role:role.trim() || null,monthly_salary:Number(salary),start_date:start,schedule,active:true}
   const query=employee ? createClient().from('employees').update(payload).eq('id',employee.id) : createClient().from('employees').insert(payload)
   const {error}=await query.select('id').single(); if(error) throw error
   await onSaved()
  } catch(e) {setError(e instanceof Error ? e.message : 'Enregistrement refusé. Vérifiez les droits et le schéma Supabase.')} finally {setBusy(false)}
 }
 const input='mt-2 w-full rounded-xl border border-gray-200 bg-white p-3 text-sm'
 return <form onSubmit={save} className="mb-6 rounded-2xl border bg-white p-6"><h2 className="mb-5 text-xl font-semibold">{employee?'Modifier l’employée':'Nouvelle employée'}</h2>
 <fieldset disabled={busy} className="space-y-5">
 <div className="grid gap-4 sm:grid-cols-2"><label>Nom complet<input required maxLength={120} className={input} value={name} onChange={e=>setName(e.target.value)}/></label><label>Fonction<input className={input} value={role} onChange={e=>setRole(e.target.value)}/></label><label>Salaire mensuel (DA)<input required type="number" min="0" max="9999999999" step="0.01" className={input} value={salary} onChange={e=>setSalary(e.target.value)}/></label><label>Date de début<input required type="date" className={input} value={start} onChange={e=>setStart(e.target.value)}/></label></div>
 <div><h3 className="font-medium">Calendrier hebdomadaire</h3><p className="mb-4 text-xs text-gray-500">Un créneau par jour. Les jours décochés sont des jours de repos.</p>{days.map((day,i)=><div key={day} className="grid grid-cols-[1fr_1fr_1fr] items-center gap-3 border-t py-3"><label className="text-sm"><input type="checkbox" className="mr-2" checked={schedule[i].enabled} onChange={e=>setSchedule(schedule.map((s,j)=>j===i?{...s,enabled:e.target.checked}:s))}/>{day}</label><input aria-label={`${day} début`} type="time" required={schedule[i].enabled} disabled={!schedule[i].enabled} value={schedule[i].start} onChange={e=>setSchedule(schedule.map((s,j)=>j===i?{...s,start:e.target.value}:s))} className="min-w-0 rounded-lg border p-2 disabled:opacity-30"/><input aria-label={`${day} fin`} type="time" required={schedule[i].enabled} disabled={!schedule[i].enabled} value={schedule[i].end} onChange={e=>setSchedule(schedule.map((s,j)=>j===i?{...s,end:e.target.value}:s))} className="min-w-0 rounded-lg border p-2 disabled:opacity-30"/></div>)}</div>
 {employee && <p className="text-sm text-amber-800">Les modifications du salaire ou du calendrier recalculent aussi les mois précédents.</p>}
 {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
 <div className="flex gap-3"><Button type="submit">{busy?'Enregistrement…':'Enregistrer'}</Button><Button type="button" variant="outline" onClick={onCancel}>Annuler</Button></div>
 </fieldset></form>
}
