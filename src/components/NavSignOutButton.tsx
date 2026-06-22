'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function NavSignOutButton({ className }: { className?: string }) {
  const supabase = createClient()
  const router   = useRouter()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <button
      onClick={handleSignOut}
      className={className ?? 'text-sm text-white/70 hover:text-white transition-colors duration-150'}
    >
      Sign Out
    </button>
  )
}
