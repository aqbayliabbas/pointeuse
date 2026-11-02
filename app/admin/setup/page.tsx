'use client'

import { FormEvent, useState } from 'react'
import { ArrowRight, KeyRound, Mail } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export default function AdminSetup() {
  const router = useRouter()
  const [email, setEmail] = useState('admin@atelier.fr')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      const { error } = await createClient().auth.signUp({
        email,
        password,
        options: {
          data: { is_admin: true },
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/auth/callback`,
        },
      })
      setMessage(error ? (error.message.toLowerCase().includes('already') ? 'Cette adresse existe déjà. Utilisez la connexion admin.' : 'Impossible de créer ce compte. Vérifiez les informations saisies.') : 'Compte créé. Vérifiez votre email pour confirmer l’accès, puis connectez-vous.')
    } catch {
      setMessage('Le service Supabase est momentanément inaccessible. Vérifiez la connexion et réessayez.')
    } finally {
      setLoading(false)
    }
  }
  return <main className="flex min-h-screen items-center justify-center bg-[#f7f7f8] px-5 py-10 text-[#191919]"><div className="w-full max-w-[430px]"><div className="mb-10 text-center"><div className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#191919] text-lg font-semibold text-white">A</div><h1 className="mt-8 text-[30px] font-semibold tracking-[-0.05em]">Créer l’accès admin</h1><p className="mt-2 text-sm text-[#77777c]">Créez vos identifiants sécurisés pour Atelier.</p></div><form onSubmit={submit} className="rounded-3xl border border-black/[0.06] bg-white p-6 shadow-[0_18px_60px_rgba(0,0,0,0.05)] sm:p-8"><label className="block text-xs font-medium text-[#55555a]" htmlFor="setup-email">Email administrateur</label><div className="mt-2 flex items-center gap-3 rounded-xl border border-black/[0.1] px-3.5"><Mail className="size-4 text-[#99999e]" /><input id="setup-email" type="email" required value={email} onChange={event => setEmail(event.target.value)} className="h-12 min-w-0 flex-1 bg-transparent text-sm outline-none" /></div><label className="mt-5 block text-xs font-medium text-[#55555a]" htmlFor="setup-password">Mot de passe</label><div className="mt-2 flex items-center gap-3 rounded-xl border border-black/[0.1] px-3.5"><KeyRound className="size-4 text-[#99999e]" /><input id="setup-password" type="password" minLength={8} required value={password} onChange={event => setPassword(event.target.value)} placeholder="8 caractères minimum" className="h-12 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#b0b0b4]" /></div>{message && <p role="status" className="mt-4 rounded-lg bg-[#f1f5ef] px-3 py-2 text-xs text-[#638064]">{message}</p>}<Button type="submit" disabled={loading} className="mt-6 h-12 w-full rounded-xl bg-[#191919] text-sm text-white hover:bg-[#333]">{loading ? 'Création…' : 'Créer mes identifiants'}<ArrowRight data-icon="inline-end" /></Button></form><button onClick={() => router.push('/admin/login')} className="mx-auto mt-8 block text-xs text-[#77777c] underline underline-offset-4">J’ai déjà un compte admin</button></div></main>
}
