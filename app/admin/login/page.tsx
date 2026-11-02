'use client'

import { FormEvent, useState } from 'react'
import { ArrowRight, LockKeyhole, Mail, ShieldCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient, isConfigured } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export default function AdminLogin() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!isConfigured) { setError('Ajoutez les clés publiques Supabase dans .env.local puis redémarrez le projet.'); return }; setLoading(true); setError('')
    try {
      const { error: signInError } = await createClient().auth.signInWithPassword({ email, password })
      if (signInError) { setError('Email ou mot de passe incorrect.'); setLoading(false); return }
      router.push('/admin'); router.refresh()
    } catch {
      setError('Le service Supabase est momentanément inaccessible. Réessayez dans un instant.')
      setLoading(false)
    }
  }
  return <main className="flex min-h-screen items-center justify-center bg-[#f7f7f8] px-5 py-10 text-[#191919]"><div className="w-full max-w-[430px]"><div className="mb-10 text-center"><div className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#191919] text-lg font-semibold text-white">A</div><p className="mt-5 text-sm font-semibold">Atelier</p><h1 className="mt-8 text-[32px] font-semibold tracking-[-0.05em]">Administration</h1><p className="mt-2 text-sm text-[#77777c]">Accédez au suivi de votre agence.</p></div><form onSubmit={submit} className="rounded-3xl border border-black/[0.06] bg-white p-6 shadow-[0_18px_60px_rgba(0,0,0,0.05)] sm:p-8"><label className="block text-xs font-medium text-[#55555a]" htmlFor="admin-email">Email administrateur</label><div className="mt-2 flex items-center gap-3 rounded-xl border border-black/[0.1] px-3.5"><Mail className="size-4 text-[#99999e]" /><input id="admin-email" type="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="Votre adresse email" className="h-12 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#b0b0b4]" /></div><label className="mt-5 block text-xs font-medium text-[#55555a]" htmlFor="admin-password">Mot de passe</label><div className="mt-2 flex items-center gap-3 rounded-xl border border-black/[0.1] px-3.5"><LockKeyhole className="size-4 text-[#99999e]" /><input id="admin-password" type="password" required value={password} onChange={event => setPassword(event.target.value)} placeholder="Votre mot de passe" className="h-12 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#b0b0b4]" /></div>{error && <p role="alert" className="mt-4 rounded-lg bg-[#fff1f1] px-3 py-2 text-xs text-[#a25f5f]">{error}</p>}<Button type="submit" disabled={loading} className="mt-6 h-12 w-full rounded-xl bg-[#191919] text-sm text-white hover:bg-[#333]">{loading ? 'Connexion…' : 'Ouvrir le dashboard'}<ArrowRight data-icon="inline-end" /></Button></form><div className="mt-6 flex items-center justify-center gap-2 text-xs text-[#99999e]"><ShieldCheck className="size-4" />Accès protégé</div><button onClick={() => router.push('/admin/setup')} className="mx-auto mt-8 block text-xs text-[#77777c] underline underline-offset-4">Créer un accès admin</button><button onClick={() => router.push('/')} className="mx-auto mt-3 block text-xs text-[#77777c] underline underline-offset-4">Retour à l’espace employé</button></div></main>
}
