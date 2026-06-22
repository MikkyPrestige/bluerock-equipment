import { createClient } from '@/lib/supabase/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import logo from '@/assests/img/logo.jpg'
import ComparisonClient, { type ComparisonMachine } from '@/components/ComparisonClient'

export default async function ComparisonPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: compItems }, { data: allWatchlist }] = await Promise.all([
    adminSupabase
      .from('watchlist')
      .select('machine_id, machines(*)')
      .eq('buyer_id', user.id)
      .eq('in_comparison', true),
    adminSupabase
      .from('watchlist')
      .select('machine_id')
      .eq('buyer_id', user.id),
  ])

  const machines = (compItems ?? [])
    .map(w => w.machines as unknown as ComparisonMachine)
    .filter(Boolean)

  const alreadySaved = (allWatchlist ?? []).map(w => w.machine_id as string)

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col">

      {/* ── NAV ── */}
      <header className="bg-navy-950/96 backdrop-blur-md border-b border-white/8 px-6 py-4 sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Image src={logo} alt="BlueRock Equipment" className="h-9 w-auto object-contain invert opacity-90" />
          </Link>
          <div className="hidden sm:flex items-center gap-2 text-white/30 text-sm">
            <Link href="/machines" className="hover:text-white transition-colors duration-150">← Inventory</Link>
            <span>/</span>
            <span className="text-white/60">Comparison</span>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <Link href="/machines"  className="text-sm text-white/40 hover:text-white sm:hidden transition-colors">← Back</Link>
          <Link href="/dashboard" className="text-sm text-white/40 hover:text-white transition-colors duration-150">Dashboard</Link>
        </div>
      </header>

      <ComparisonClient machines={machines} alreadySaved={alreadySaved} />
    </div>
  )
}
