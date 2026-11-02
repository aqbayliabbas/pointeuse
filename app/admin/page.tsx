'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  LayoutDashboard,
  LogOut,
  Menu,
  MoreHorizontal,
  Users,
  WalletCards,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

type View = 'dashboard' | 'employees' | 'payroll'

type Employee = {
  initials: string
  name: string
  role: string
  salary: number
  status: 'Présente' | 'Absente'
  hours: string
  accent: string
}

const employees: Employee[] = [
  { initials: 'SM', name: 'Sophie Martin', role: 'Responsable beauté', salary: 2450, status: 'Présente', hours: '08:42', accent: 'bg-[#e8d9cf]' },
  { initials: 'CL', name: 'Camille Laurent', role: 'Esthéticienne', salary: 1980, status: 'Présente', hours: '08:31', accent: 'bg-[#dbe2eb]' },
  { initials: 'NA', name: 'Nina Abdou', role: 'Coiffeuse', salary: 2100, status: 'Absente', hours: '—', accent: 'bg-[#e6dfcf]' },
  { initials: 'EM', name: 'Emma Morel', role: 'Manucure', salary: 1850, status: 'Présente', hours: '09:04', accent: 'bg-[#ddd8e7]' },
]

const navItems: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'employees', label: 'Employées', icon: Users },
  { id: 'payroll', label: 'Paie', icon: WalletCards },
]

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value)
}

export default function Page() {
  const router = useRouter()
  const [view, setView] = useState<View>('dashboard')
  useEffect(() => { createClient().auth.getUser().then(({ data }) => { if (!data.user) router.replace('/admin/login') }) }, [router])
  const [mobileNav, setMobileNav] = useState(false)
  const [month, setMonth] = useState('Octobre 2024')

  const totalPayroll = useMemo(() => employees.reduce((sum, employee) => sum + employee.salary, 0), [])

  return (
    <main className="min-h-screen bg-[#f7f7f8] text-[#191919]">
      <div className="flex min-h-screen">
        <aside className={`${mobileNav ? 'flex' : 'hidden'} fixed inset-y-0 left-0 z-20 w-[252px] flex-col border-r border-black/[0.06] bg-white px-5 py-6 lg:flex`}>
          <div className="flex items-center gap-3 px-2">
            <div className="grid size-9 place-items-center rounded-xl bg-[#191919] text-sm font-semibold text-white">A</div>
            <div>
              <p className="text-[15px] font-semibold tracking-[-0.02em]">Atelier</p>
              <p className="text-xs text-[#8a8a8f]">Espace admin</p>
            </div>
          </div>
          <div className="mt-12 flex flex-1 flex-col">
            <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#a0a0a5]">Menu principal</p>
            <nav className="mt-3 flex flex-col gap-1">
              {navItems.map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => { setView(id); setMobileNav(false) }} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${view === id ? 'bg-[#f1f1f2] font-medium text-[#191919]' : 'text-[#77777c] hover:bg-[#f7f7f8] hover:text-[#191919]'}`}>
                  <Icon className="size-[17px]" strokeWidth={1.8} />
                  {label}
                  {id === 'employees' && <span className="ml-auto rounded-full bg-[#e9e9eb] px-2 py-0.5 text-[10px] text-[#77777c]">12</span>}
                </button>
              ))}
            </nav>
            <div className="mt-auto border-t border-black/[0.06] pt-5">
              <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#77777c] hover:bg-[#f7f7f8]"><LogOut className="size-[17px]" strokeWidth={1.8} />Se déconnecter</button>
            </div>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col lg:ml-[252px]">
          <header className="flex h-[76px] items-center justify-between border-b border-black/[0.06] bg-white/80 px-5 backdrop-blur-xl sm:px-8 lg:px-12">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileNav(true)} aria-label="Ouvrir le menu"><Menu /></Button>
              <p className="text-sm text-[#77777c]">Bonjour, <span className="font-medium text-[#191919]">Louenes</span></p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 rounded-lg border border-black/[0.08] bg-white px-3 py-2 text-xs text-[#68686d] sm:flex"><CalendarDays className="size-3.5" />{month}<ChevronDown className="size-3.5" /></div>
              <div className="grid size-9 place-items-center rounded-full bg-[#d6e2d6] text-xs font-semibold text-[#415541]">LM</div>
            </div>
          </header>

          <div className="mx-auto w-full max-w-[1320px] flex-1 px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
            {view === 'dashboard' && <Dashboard employees={employees} totalPayroll={totalPayroll} setView={setView} />}
            {view === 'employees' && <Employees employees={employees} />}
            {view === 'payroll' && <Payroll employees={employees} totalPayroll={totalPayroll} />}
          </div>
        </section>
      </div>
    </main>
  )
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-[#96969b]">{eyebrow}</p><h1 className="text-[30px] font-semibold tracking-[-0.045em] sm:text-[36px]">{title}</h1><p className="mt-2 text-sm text-[#77777c]">{description}</p></div>{action}</div>
}

function Dashboard({ employees, totalPayroll, setView }: { employees: Employee[]; totalPayroll: number; setView: (view: View) => void }) {
  return <>
    <PageHeading eyebrow="Vue d'ensemble" title="Votre activité" description="Suivez les présences et la paie de votre agence." action={<Button onClick={() => setView('employees')} className="rounded-xl bg-[#191919] px-4 text-xs text-white hover:bg-[#333]">Gérer les employées <ArrowUpRight data-icon="inline-end" /></Button>} />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Kpi icon={Users} label="Employées actives" value="12" note="+2 ce mois-ci" positive />
      <Kpi icon={Clock3} label="Présence aujourd'hui" value="91,7 %" note="11 sur 12 présentes" positive />
      <Kpi icon={CircleDollarSign} label="Paie estimée" value={formatCurrency(totalPayroll)} note="Octobre 2024" />
      <Kpi icon={CalendarDays} label="Heures ce mois" value="1 248 h" note="+6,4 % vs septembre" positive />
    </div>
    <div className="mt-8 grid gap-5 xl:grid-cols-[1.35fr_1fr]">
      <section className="rounded-2xl border border-black/[0.06] bg-white p-5 sm:p-6"><div className="flex items-start justify-between"><div><h2 className="text-[15px] font-semibold">Présences de la semaine</h2><p className="mt-1 text-xs text-[#929297]">Taux de présence quotidien</p></div><Button variant="ghost" size="icon-sm" aria-label="Plus d'options"><MoreHorizontal /></Button></div><div className="mt-8 flex h-[190px] items-end justify-between gap-3 px-2">{[['Lun','82%'],['Mar','94%'],['Mer','88%'],['Jeu','100%'],['Ven','91%'],['Sam','64%'],['Dim','0%']].map(([day, value], index) => <div key={day} className="flex h-full flex-1 flex-col items-center justify-end gap-3"><div className="flex h-full w-full max-w-[42px] items-end rounded-lg bg-[#f4f4f5]"><div className={`w-full rounded-lg ${index === 6 ? 'bg-[#ededee]' : 'bg-[#191919]'}`} style={{ height: value }} /></div><span className="text-[11px] text-[#96969b]">{day}</span></div>)}</div></section>
      <section className="rounded-2xl border border-black/[0.06] bg-white p-5 sm:p-6"><div className="flex items-start justify-between"><div><h2 className="text-[15px] font-semibold">État des présences</h2><p className="mt-1 text-xs text-[#929297]">Aujourd'hui, 24 octobre</p></div><Button variant="ghost" size="sm" onClick={() => setView('employees')} className="text-xs text-[#77777c]">Voir tout</Button></div><div className="mt-6 flex flex-col gap-4">{employees.slice(0, 4).map(employee => <EmployeeRow key={employee.name} employee={employee} />)}</div></section>
    </div>
    <section className="mt-5 rounded-2xl border border-black/[0.06] bg-white p-5 sm:p-6"><div className="flex items-center justify-between"><div><h2 className="text-[15px] font-semibold">Résumé de la paie</h2><p className="mt-1 text-xs text-[#929297]">Estimation basée sur les pointages du mois</p></div><Button variant="outline" size="sm" onClick={() => setView('payroll')} className="rounded-lg text-xs">Détails de la paie <ArrowUpRight data-icon="inline-end" /></Button></div><div className="mt-6 grid gap-6 sm:grid-cols-3"><div><p className="text-xs text-[#929297]">Total estimé</p><p className="mt-1 text-2xl font-semibold tracking-[-0.04em]">{formatCurrency(totalPayroll)}</p></div><div><p className="text-xs text-[#929297]">Jours travaillés</p><p className="mt-1 text-2xl font-semibold tracking-[-0.04em]">264 <span className="text-sm font-normal text-[#929297]">/ 288</span></p></div><div><p className="text-xs text-[#929297]">Absences déduites</p><p className="mt-1 text-2xl font-semibold tracking-[-0.04em]">{formatCurrency(328)} <span className="text-sm font-normal text-[#929297]">ce mois</span></p></div></div></section>
  </>
}

function Kpi({ icon: Icon, label, value, note, positive }: { icon: typeof Users; label: string; value: string; note: string; positive?: boolean }) { return <div className="rounded-2xl border border-black/[0.06] bg-white p-5"><div className="flex items-center justify-between"><p className="text-xs text-[#89898e]">{label}</p><Icon className="size-4 text-[#9b9ba0]" strokeWidth={1.8} /></div><p className="mt-5 text-[26px] font-semibold tracking-[-0.05em]">{value}</p><p className={`mt-1 text-xs ${positive ? 'text-[#68836a]' : 'text-[#9b9ba0]'}`}>{note}</p></div> }

function EmployeeRow({ employee }: { employee: Employee }) { return <div className="flex items-center gap-3"><div className={`grid size-9 shrink-0 place-items-center rounded-full ${employee.accent} text-[10px] font-semibold text-[#505056]`}>{employee.initials}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{employee.name}</p><p className="mt-0.5 text-xs text-[#99999e]">{employee.role}</p></div><div className="text-right"><span className={`rounded-full px-2 py-1 text-[10px] font-medium ${employee.status === 'Présente' ? 'bg-[#eaf3e9] text-[#658267]' : 'bg-[#f5eeee] text-[#9a6d6d]'}`}>{employee.status}</span><p className="mt-1 text-[11px] text-[#99999e]">{employee.hours}</p></div></div> }

function Employees({ employees }: { employees: Employee[] }) { return <><PageHeading eyebrow="Équipe" title="Employées" description="Gérez les salaires, horaires et informations de votre équipe." action={<Button className="rounded-xl bg-[#191919] px-4 text-xs text-white hover:bg-[#333]">Ajouter une employée</Button>} /><section className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white"><div className="flex items-center justify-between border-b border-black/[0.06] px-5 py-4"><p className="text-sm font-medium">Toutes les employées <span className="ml-1 text-xs text-[#99999e]">12</span></p><Button variant="outline" size="sm" className="text-xs">Filtrer <ChevronDown data-icon="inline-end" /></Button></div><div className="divide-y divide-black/[0.06]">{employees.map(employee => <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center" key={employee.name}><div className="flex flex-1 items-center gap-3"><div className={`grid size-10 place-items-center rounded-full ${employee.accent} text-xs font-semibold text-[#505056]`}>{employee.initials}</div><div><p className="text-sm font-medium">{employee.name}</p><p className="mt-1 text-xs text-[#99999e]">{employee.role}</p></div></div><div className="grid grid-cols-2 gap-8 sm:grid-cols-3"><div><p className="text-[10px] uppercase tracking-wider text-[#aaaab0]">Salaire</p><p className="mt-1 text-sm font-medium">{formatCurrency(employee.salary)}<span className="text-xs font-normal text-[#99999e]"> / mois</span></p></div><div><p className="text-[10px] uppercase tracking-wider text-[#aaaab0]">Planning</p><p className="mt-1 text-sm">Lun — Sam</p></div><div className="hidden sm:block"><p className="text-[10px] uppercase tracking-wider text-[#aaaab0]">Statut</p><p className="mt-1 text-sm text-[#68836a]">Actif</p></div></div><Button variant="ghost" size="icon-sm" aria-label={`Options pour ${employee.name}`}><MoreHorizontal /></Button></div>)}</div></section></> }

function Payroll({ employees, totalPayroll }: { employees: Employee[]; totalPayroll: number }) { return <><PageHeading eyebrow="Finances" title="Paie" description="Calculez automatiquement les salaires selon les pointages." action={<Button className="rounded-xl bg-[#191919] px-4 text-xs text-white hover:bg-[#333]">Exporter le récapitulatif</Button>} /><div className="grid gap-4 sm:grid-cols-3"><Kpi icon={CircleDollarSign} label="Total à payer" value={formatCurrency(totalPayroll - 328)} note="Après déductions" /><Kpi icon={Users} label="Employées" value="12" note="Ce mois-ci" /><Kpi icon={Clock3} label="Absences" value="4" note="Jours déduits" /></div><section className="mt-8 overflow-hidden rounded-2xl border border-black/[0.06] bg-white"><div className="border-b border-black/[0.06] px-5 py-4"><h2 className="text-sm font-medium">Détail des salaires — Octobre 2024</h2></div><div className="divide-y divide-black/[0.06]">{employees.map(employee => <div className="flex items-center gap-3 px-5 py-4" key={employee.name}><div className={`grid size-9 place-items-center rounded-full ${employee.accent} text-[10px] font-semibold text-[#505056]`}>{employee.initials}</div><div className="flex-1"><p className="text-sm font-medium">{employee.name}</p><p className="mt-0.5 text-xs text-[#99999e]">{employee.status === 'Absente' ? '1 absence déduite automatiquement' : 'Pointage conforme'}</p></div><div className="text-right"><p className="text-sm font-semibold">{formatCurrency(employee.status === 'Absente' ? employee.salary - 82 : employee.salary)}</p><p className="mt-0.5 text-xs text-[#99999e]">Net estimé</p></div></div>)}</div></section></> }
