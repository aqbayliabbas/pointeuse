'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { CalendarDays, Check, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

type Action = 'debut' | 'pause' | 'retour' | 'sortie'
type Employee = { id: string; full_name: string; role: string | null; schedule_start: string | null; schedule_end: string | null }
type AttendanceEvent = { event_type: Action; event_at: string }

const actionLabels: Record<Action, string> = { debut: 'Début de journée', pause: 'Début de pause', retour: 'Retour de pause', sortie: 'Sortie' }
const fetchEmployees = async () => { const { data, error } = await createClient().from('employees').select('id, full_name, role, schedule_start, schedule_end').eq('active', true).order('full_name'); if (error) throw error; return data as Employee[] }
const fetchAttendance = async (employeeId: string) => { const start = new Date(); start.setHours(0, 0, 0, 0); const { data, error } = await createClient().from('attendance_events').select('event_type, event_at').eq('employee_id', employeeId).gte('event_at', start.toISOString()).order('event_at'); if (error) throw error; return data as AttendanceEvent[] }

export default function EmployeePage() {
  const { data: employees = [], error: employeesError, isLoading } = useSWR('employees', fetchEmployees)
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const employeeId = selectedEmployee || employees[0]?.id || ''
  const { data: events = [], mutate: refreshEvents } = useSWR(employeeId ? ['attendance', employeeId] : null, ([, id]) => fetchAttendance(id))
  const currentEmployee = employees.find(employee => employee.id === employeeId)
  const eventByType = useMemo(() => Object.fromEntries(events.map(event => [event.event_type, new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(event.event_at))])) as Partial<Record<Action, string>>, [events])
  const lastEvent = events.at(-1)

  async function punch(eventType: Action) {
    if (!employeeId) return
    try {
      const { error } = await createClient().from('attendance_events').insert({ employee_id: employeeId, event_type: eventType })
      if (!error) await refreshEvents()
    } catch {
      await refreshEvents()
    }
  }

  return <main className="min-h-screen bg-[#f7f7f8] px-5 py-8 text-[#191919] sm:px-8"><div className="mx-auto max-w-[820px]"><header className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-xl bg-[#191919] text-sm font-semibold text-white">A</div><div><p className="text-sm font-semibold">Atelier</p><p className="text-xs text-[#99999e]">Espace pointage</p></div></header><div className="mt-16"><p className="text-xs font-medium uppercase tracking-[0.12em] text-[#96969b]">Pointage du jour</p><h1 className="mt-2 text-[32px] font-semibold tracking-[-0.05em]">Pointage des employées</h1><p className="mt-2 text-sm text-[#77777c]">Sélectionnez une employée, puis choisissez l’action correspondante.</p></div><section className="mt-8 rounded-3xl border border-black/[0.06] bg-white p-6 shadow-[0_18px_60px_rgba(0,0,0,0.04)] sm:p-8"><div className="flex items-center gap-3 text-sm text-[#77777c]"><CalendarDays className="size-4" />Pointage du jour</div><label className="mt-8 block text-xs font-medium text-[#55555a]" htmlFor="employee">Employée</label><div className="relative mt-2"><select id="employee" value={employeeId} onChange={event => setSelectedEmployee(event.target.value)} disabled={isLoading || employees.length === 0} className="h-14 w-full appearance-none rounded-xl border border-black/[0.1] bg-white px-4 pr-11 text-sm font-medium outline-none transition focus:border-black/30"><option value="">{isLoading ? 'Chargement…' : 'Sélectionner une employée'}</option>{employees.map(employee => <option key={employee.id} value={employee.id}>{employee.full_name} — {employee.role}</option>)}</select><ChevronDown className="pointer-events-none absolute right-4 top-5 size-4 text-[#77777c]" /></div>{employeesError && <p className="mt-3 text-xs text-[#a25f5f]">Impossible de charger la liste des employées.</p>}{currentEmployee && <><div className="mt-8 flex items-center gap-3 rounded-2xl bg-[#f7f7f8] p-4"><div className="grid size-11 place-items-center rounded-full bg-[#e8d9cf] text-xs font-semibold text-[#59504a]">{currentEmployee.full_name.split(' ').map(name => name[0]).join('').slice(0, 2)}</div><div><p className="text-sm font-semibold">{currentEmployee.full_name}</p><p className="mt-1 text-xs text-[#99999e]">Planning : {currentEmployee.schedule_start?.slice(0, 5) ?? '09:00'} — {currentEmployee.schedule_end?.slice(0, 5) ?? '18:00'}</p></div></div><div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">{(Object.keys(actionLabels) as Action[]).map(action => { const time = eventByType[action]; const disabled = action !== 'debut' && !eventByType.debut; return <Button key={action} disabled={disabled} onClick={() => punch(action)} variant={time ? 'secondary' : 'outline'} className={`h-auto min-h-16 flex-col items-start gap-1 rounded-xl px-4 py-3 text-left ${time ? 'border-[#cbdcc9] bg-[#edf5ec] text-[#5e7d60]' : 'border-black/[0.1] bg-white text-[#36363a] hover:bg-[#f7f7f8]'}`}><span className="text-xs font-medium">{actionLabels[action]}</span><span className="text-[11px] font-normal opacity-70">{time ?? 'Pointer'}</span></Button> })}</div>{lastEvent && <div className="mt-6 flex items-center gap-2 text-xs text-[#68836a]"><Check className="size-4" />{actionLabels[lastEvent.event_type]} enregistré à {eventByType[lastEvent.event_type]}</div>}</>}</section></div></main>
}
