import { createClient }  from '@/lib/supabase/server'
import { adminSupabase }  from '@/lib/supabase/admin'
import { redirect }       from 'next/navigation'
import Link               from 'next/link'
import Image              from 'next/image'
import SignOutButton      from '@/app/dashboard/signout-button'
import BuyerMobileNav    from '@/components/BuyerMobileNav'
import WatchlistClient, { type WatchlistEntry } from '@/components/dashboard/WatchlistClient'
import logo from '@/assests/img/logo.jpg'

const PAGE_SIZE = 12

export default async function WatchlistPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: buyer }, { data: raw, count: totalCount }] = await Promise.all([
    supabase.from('buyers').select('company_name, tier').eq('id', user.id).single(),
    adminSupabase
      .from('watchlist')
      .select(
        'machine_id, in_comparison, arrival_alert_params, created_at, machines(id, name, brand, model, year, category, price_usd, engine_hours, status, yard_city, yard_country)',
        { count: 'exact' }
      )
      .eq('buyer_id', user.id)
      .order('created_at', { ascending: false })
      .range(0, PAGE_SIZE - 1),
  ])

  const initialEntries = (raw ?? []) as unknown as WatchlistEntry[]
  const total          = totalCount ?? 0
  const isAdmin        = user.email === process.env.ADMIN_EMAIL

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col">

      {/* ── NAV ── */}
      <header className="sticky top-0 z-50 bg-navy-950/96 backdrop-blur-md border-b border-white/8 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link href="/">
            <Image src={logo} alt="BlueRock Equipment" className="h-9 w-auto object-contain invert opacity-90" />
          </Link>
          <span className="hidden sm:inline text-xs text-gold-400 font-semibold uppercase tracking-widest">
            Buyer Dashboard
          </span>
        </div>
        <div className="flex items-center gap-4">
          <nav className="hidden sm:flex items-center gap-5 text-sm text-white/40">
            <Link href="/dashboard"  className="hover:text-white transition-colors duration-150">Overview</Link>
            <Link href="/machines"   className="hover:text-white transition-colors duration-150">Inventory</Link>
          </nav>
          <div className="h-4 w-px bg-white/10 hidden sm:block" />
          {isAdmin && (
            <Link
              href="/admin"
              className="text-xs font-bold text-gold-400 hover:text-gold-300 border border-gold-400/30 hover:border-gold-400/55 px-3 py-1.5 rounded-lg transition-all duration-150"
            >
              Admin Panel
            </Link>
          )}
          <SignOutButton />
          <BuyerMobileNav isAdmin={isAdmin} />
        </div>
      </header>

      {/* ── TITLE BAR ── */}
      <div className="bg-navy-900 border-b border-white/8 px-6 py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-xs text-white/30 mb-2">
              <Link href="/dashboard" className="hover:text-gold-400 transition-colors">Dashboard</Link>
              <span>/</span>
              <span className="text-white/55">Watchlist</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">My Watchlist</h1>
              {total > 0 && (
                <span className="text-sm font-bold px-3 py-1 rounded-full bg-gold-400/15 border border-gold-400/30 text-gold-400">
                  {total}
                </span>
              )}
            </div>
            {buyer?.company_name && (
              <p className="text-white/30 text-sm mt-1">{buyer.company_name}</p>
            )}
          </div>
        </div>
      </div>

      {/* ── MAIN ── */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8">
        <WatchlistClient initialEntries={initialEntries} totalCount={total} />
      </main>

      {/* ── FOOTER ── */}
      <footer className="bg-navy-950 border-t border-white/5 py-6 px-6 mt-auto">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <p className="text-xs text-white/20">BlueRock Equipment — Premium Direct-Sale Heavy Machinery</p>
          <Link href="/dashboard" className="text-xs text-white/25 hover:text-white/50 transition-colors">
            ← Dashboard
          </Link>
        </div>
      </footer>

    </div>
  )
}
