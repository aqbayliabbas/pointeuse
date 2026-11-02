'use client'
import { useEffect, useState } from 'react'
import { createClient, isConfigured } from '@/lib/supabase/client'
export function useAccess() {
  const [ready, setReady] = useState(false)
  const [message, setMessage] = useState('Vérification de votre accès…')
  useEffect(() => {
    if (!isConfigured) { setMessage('Configuration en attente : ajoutez vos clés publiques Supabase dans .env.local, puis redémarrez le projet.'); return }
    let alive = true
    async function check() {
      try {
        const { data, error } = await createClient().auth.getUser()
        if (!alive) return
        if (error || !data.user) { setReady(false); setMessage('Connectez-vous pour accéder à cet espace.'); return }
        if (data.user.app_metadata.role !== 'admin') {
          setReady(false)
          setMessage(`Le compte ${data.user.email ?? ''} est connecté, mais son rôle administrateur n’est pas encore configuré dans Supabase. Ouvrez « Configurer mon accès » pour la correction ciblée.`)
          return
        }
        // RLS reads the token, so refresh it after checking the current server role.
        const { error: refreshError } = await createClient().auth.refreshSession()
        if (!alive) return
        if (refreshError) { setReady(false); setMessage('Reconnectez-vous pour actualiser vos droits.'); return }
        setReady(true)
      } catch { if (alive) { setReady(false); setMessage('Connexion impossible. Vérifiez votre configuration Supabase.') } }
    }
    void check()
    const { data: listener } = createClient().auth.onAuthStateChange((event: string) => {
      if (event === 'SIGNED_OUT') { setReady(false); setMessage('Vous êtes déconnecté.') }
    })
    return () => { alive = false; listener.subscription.unsubscribe() }
  }, [])
  return { ready, message }
}
export function AccessNotice({ message }: { message: string }) {
  return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950"><p>{message}</p>{isConfigured && <div className="mt-3 flex flex-wrap gap-5"><a href="/admin/setup" className="underline">Configurer mon accès</a><button onClick={() => window.location.reload()} className="underline">Actualiser mes droits</button><a href="/admin/login" className="underline">Changer de compte</a></div>}</div>
}
