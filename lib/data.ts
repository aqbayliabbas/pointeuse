import { createClient } from './supabase/client'
import type { Employee, Punch } from './payroll'
export async function loadEmployees(): Promise<Employee[]> {
  const { data, error } = await createClient().from('employees').select('*').order('full_name')
  if (error) throw new Error(error.message)
  return data ?? []
}
export async function loadPunches(month: string): Promise<Punch[]> {
  // The UTC window is deliberately wider; payroll groups by Casablanca date.
  const [y, m] = month.split('-').map(Number)
  const from = new Date(Date.UTC(y, m - 1, 0)).toISOString()
  const until = new Date(Date.UTC(y, m, 2)).toISOString()
  const rows: Punch[] = []
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await createClient().from('attendance_events').select('*').gte('event_at', from).lt('event_at', until).order('event_at').order('id').range(offset, offset + 999)
    if (error) throw new Error(error.message)
    rows.push(...(data ?? []))
    if (!data || data.length < 1000) return rows
  }
}
