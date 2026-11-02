import { createBrowserClient } from '@supabase/ssr'
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
export const isConfigured = Boolean(url && key && !key.startsWith('sb_secret_'))
let client: ReturnType<typeof createBrowserClient> | undefined
export function createClient() {
  if (!isConfigured) throw new Error('Ajoutez l’URL et la clé publique Supabase dans .env.local.')
  if (!client) client = createBrowserClient(url!, key!)
  return client
}
