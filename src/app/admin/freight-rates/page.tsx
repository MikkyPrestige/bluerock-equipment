import { adminSupabase } from '@/lib/supabase/admin'
import { createClient }  from '@/lib/supabase/server'
import { redirect }      from 'next/navigation'
import Link              from 'next/link'
import Image             from 'next/image'
import logo              from '@/assests/img/logo.jpg'
import FreightRatesTable from '@/components/admin/FreightRatesTable'

const TABS = [
  { label: 'Inventory',    href: '/admin/inventory' },
  { label: 'Quotes',       href: '/admin/quotes' },
  { label: 'Buyers',       href: '/admin/buyers' },
  { label: 'Walkthroughs', href: '/admin/walkthroughs' },
  { label: 'Freight',      href: '/admin/freight-rates' },
]

export default async function FreightRatesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) redirect('/auth/login')

  const { data: rates } = await adminSupabase
    .from('freight_rates')
    .select('id, port_name, country, base_cost_usd, updated_at')
    .order('country')
    .order('port_name')

  const all = rates ?? []

  const sortedDates = all
    .map(r => new Date(r.updated_at).getTime())
    .sort((a, b) => b - a)

  const lastUpdated = sortedDates[0]
    ? new Date(sortedDates[0]).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
  const staleCount = all.filter(r => new Date(r.updated_at).getTime() < thirtyDaysAgo).length

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col">

      {/* ── STICKY NAV ── */}
      <header className="sticky top-0 z-40 bg-navy-950/96 backdrop-blur-md border-b border-white/8">
        <div className="px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Image src={logo} alt="BlueRock Equipment" className="h-9 w-auto object-contain invert opacity-90" />
            </Link>
            <div className="hidden sm:block h-5 w-px bg-white/10" />
            <div className="hidden sm:block">
              <p className="text-[10px] font-bold text-gold-400 uppercase tracking-widest leading-none mb-1">Admin</p>
              <p className="font-display text-sm font-bold text-white leading-none">Freight Rates</p>
            </div>
          </div>
          <Link href="/admin" className="text-xs text-white/35 hover:text-white/65 transition-colors duration-150 hidden sm:inline">
            Dashboard
          </Link>
        </div>

        {/* Tab bar */}
        <div className="px-6 overflow-x-auto scrollbar-hide">
          <div className="flex items-center min-w-max border-t border-white/6">
            {TABS.map(tab => {
              const isActive = tab.href === '/admin/freight-rates'
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`px-5 py-3 text-xs font-semibold border-b-2 transition-colors duration-150 whitespace-nowrap ${
                    isActive
                      ? 'border-gold-400 text-gold-400'
                      : 'border-transparent text-white/35 hover:text-white/65 hover:border-white/20'
                  }`}
                >
                  {tab.label}
                </Link>
              )
            })}
          </div>
        </div>
      </header>

      {/* ── AMBER BANNER ── */}
      <div className="border-l-4 border-amber-500 bg-amber-500/10 px-6 py-3.5">
        <div className="max-w-5xl mx-auto">
          <p className="text-sm font-bold text-amber-400">
            {lastUpdated ? `Last updated: ${lastUpdated}` : 'No rates loaded yet'}
            {staleCount > 0 && (
              <span className="ml-3 text-[11px] font-bold bg-amber-500/20 border border-amber-500/30 text-amber-400 px-2 py-0.5 rounded-full">
                {staleCount} overdue
              </span>
            )}
          </p>
          <p className="text-xs text-amber-400/65 mt-0.5 leading-relaxed">
            Monthly refresh needed — verify base costs with your shipping partners before quoting freight estimates.
          </p>
        </div>
      </div>

      {/* ── MAIN ── */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8">
        <FreightRatesTable rates={all} />
      </main>

      {/* ── FOOTER ── */}
      <footer className="bg-navy-950 border-t border-white/5 py-6 px-6 mt-auto">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <p className="text-xs text-white/20">BlueRock Equipment — Admin Operations</p>
          <Link href="/admin" className="text-xs text-white/25 hover:text-white/50 transition-colors duration-150">
            ← Dashboard
          </Link>
        </div>
      </footer>

    </div>
  )
}
