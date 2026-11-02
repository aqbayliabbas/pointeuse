export type Shift = { enabled: boolean; start: string; end: string }
export type Employee = { id: string; full_name: string; role: string | null; monthly_salary: number; schedule: Shift[]; start_date: string; active: boolean; end_date: string | null }
export type Punch = { id: string; employee_id: string; event_type: 'debut' | 'pause' | 'retour' | 'sortie'; event_at: string }
export const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
export const emptySchedule = (): Shift[] => days.map(() => ({ enabled: false, start: '09:00', end: '18:00' }))
export function localDate(date = new Date()) { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Casablanca', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date) }
export function minute(time: string) { const [h, m] = time.split(':').map(Number); return h * 60 + m }
function eventMinute(event: Punch) { return minute(new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Casablanca', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(event.event_at))) }
export const money = (n: number) => new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD' }).formatToParts(n).map(part => part.type === 'currency' ? 'DA' : part.value).join('')
export function payroll(employee: Employee, events: Punch[], month: string, today = localDate()) {
  let planned = 0, elapsed = 0, worked = 0, absenceDays = 0, incomplete = 0, completedWorked = 0
  const [year, mon] = month.split('-').map(Number)
  const count = new Date(Date.UTC(year, mon, 0)).getUTCDate()
  for (let day = 1; day <= count; day++) {
    const date = `${month}-${String(day).padStart(2, '0')}`
    const shift = employee.schedule[new Date(Date.UTC(year, mon - 1, day)).getUTCDay()]
    if (!shift?.enabled) continue
    const start = minute(shift.start), end = minute(shift.end), duration = Math.max(0, end - start)
    planned += duration
    if (date < employee.start_date || (employee.end_date && date > employee.end_date)) continue
    if (date > today) continue
    const punches = events.filter(e => e.employee_id === employee.id && localDate(new Date(e.event_at)) === date).sort((a, b) => a.event_at.localeCompare(b.event_at))
    let opened: number | null = null, minutes = 0, invalid = false
    let state: Punch['event_type'] | null = null
    for (const punch of punches) {
      const t = eventMinute(punch)
      const valid = (!state && punch.event_type === 'debut') || ((state === 'debut' || state === 'retour') && ['pause', 'sortie'].includes(punch.event_type)) || (state === 'pause' && ['retour', 'sortie'].includes(punch.event_type))
      if (!valid) { invalid = true; continue }
      if (punch.event_type === 'debut' || punch.event_type === 'retour') opened = t
      else if (opened !== null) { minutes += Math.max(0, Math.min(t, end) - Math.max(opened, start)); opened = null }
      state = punch.event_type
    }
    worked += Math.min(duration, minutes)
    if (date < today) {
      elapsed += duration
      completedWorked += Math.min(duration, minutes)
      if (!punches.length) absenceDays++
      else if (state !== 'sortie' || invalid) incomplete++
    }
  }
  // Today's unfinished shift is never counted as an absence.
  const pastWorked = events.length ? worked : 0
  const amount = planned ? Math.round(Number(employee.monthly_salary) * pastWorked / planned * 100) / 100 : 0
  return { planned, worked, missing: Math.max(0, elapsed - completedWorked), absenceDays, incomplete, amount }
}
