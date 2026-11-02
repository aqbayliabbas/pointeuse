'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient, isConfigured } from '@/lib/supabase/client'
export default function Setup(){
 const [account,setAccount]=useState<{id:string;email?:string}|null>(null)
 const [status,setStatus]=useState('Chargement du compte connecté…')
 useEffect(()=>{
  if(!isConfigured){setStatus('Renseignez d’abord les clés publiques Supabase dans .env.local.');return}
  createClient().auth.getUser().then(({data,error}:{data:{user:{id:string;email?:string}|null};error:unknown})=>{
   if(error||!data.user){setStatus('Connectez-vous pour obtenir la correction correspondant à votre compte.');return}
   setAccount({id:data.user.id,email:data.user.email});setStatus('')
  }).catch(()=>setStatus('Impossible de vérifier le compte. Réessayez après connexion.'))
 },[])
 const sql=account && /^[0-9a-f-]{36}$/i.test(account.id)?`update auth.users\nset raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)\n  || '{"role":"admin"}'::jsonb\nwhere id = '${account.id}'::uuid\nreturning email, raw_app_meta_data ->> 'role' as role;`:''
 return <main className="mx-auto max-w-2xl p-8"><h1 className="mt-12 text-2xl font-semibold">Configurer votre accès administrateur</h1>{status&&<p role="status" className="mt-6">{status}</p>}{account&&<><p className="mt-6">Compte connecté : <strong>{account.email}</strong></p><p className="mt-4">Dans le projet Supabase de cette application, ouvrez SQL Editor et exécutez la commande suivante. Elle attribue le rôle administrateur uniquement à ce compte.</p><pre className="mt-5 overflow-x-auto rounded-xl bg-gray-100 p-5 text-sm"><code>{sql}</code></pre><p className="mt-4 text-sm text-gray-600">Le résultat doit afficher votre adresse et le rôle « admin ». Ensuite, revenez à l’administration : vos droits seront actualisés automatiquement.</p></>}<div className="mt-8 flex gap-6"><Link href="/admin" className="underline">Retour à l’administration</Link><Link href="/admin/login" className="underline">Se connecter</Link></div></main>
}
