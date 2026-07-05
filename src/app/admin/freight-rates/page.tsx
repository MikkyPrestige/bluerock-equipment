import { adminSupabase } from '@/lib/supabase/admin'
import { createClient }  from '@/lib/supabase/server'
import { redirect }      from 'next/navigation'
import Link              from 'next/link'
import Image             from 'next/image'
import logo              from '@/assests/img/logo.jpg'
import AdminMobileNav   from '@/components/AdminMobileNav'
import FreightRatesTable from '@/components/admin/FreightRatesTable'

const TABS = [
  { label: 'Inventory',    href: '/admin/inventory' },
  { label: 'Quotes',       href: '/admin/quotes' },
  { label: 'Buyers',       href: '/admin/buyers' },
  { label: 'Waitlist',     href: '/admin/waitlist' },
  { label: 'Walkthroughs', href: '/admin/walkthroughs' },
  { label: 'Freight',      href: '/admin/freight-rates' },
  { label: 'Support',      href: '/admin/support' },
]

const PAGE_SIZE = 15

export default async function FreightRatesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1', 10))
  const offset = (page - 1) * PAGE_SIZE

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) redirect('/auth/login')

  const thirtyDaysAgoISO = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { count: totalCount },
    { data: latestRow },
    { count: staleTotal },
    { data: rates },
  ] = await Promise.all([
    adminSupabase.from('freight_rates').select('*', { count: 'exact', head: true }),
    adminSupabase.from('freight_rates').select('updated_at').order('updated_at', { ascending: false }).limit(1),
    adminSupabase.from('freight_rates').select('*', { count: 'exact', head: true }).lt('updated_at', thirtyDaysAgoISO),
    adminSupabase
      .from('freight_rates')
      .select('id, port_name, country, base_cost_usd, updated_at')
      .order('country')
      .order('port_name')
      .range(offset, offset + PAGE_SIZE - 1),
  ])

  const total      = totalCount ?? 0
  const pageRates  = rates ?? []
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const staleCount = staleTotal ?? 0

  const lastUpdated = latestRow?.[0]?.updated_at
    ? new Date(latestRow[0].updated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null

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
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-xs text-white/35 hover:text-white/65 transition-colors duration-150 hidden sm:inline">
              Dashboard
            </Link>
            <AdminMobileNav />
          </div>
        </div>

        {/* Tab bar */}
        <div className="hidden sm:block px-6 overflow-x-auto scrollbar-hide">
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
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 space-y-4">
        <FreightRatesTable rates={pageRates} totalCount={total} />
        {total >= 5 && (
          <div className="bg-navy-900 border border-white/8 rounded-2xl flex items-center justify-between px-5 py-3.5">
            <Link
              href={`/admin/freight-rates?page=${page - 1}`}
              aria-disabled={page <= 1}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all duration-150 ${
                page <= 1
                  ? 'border-white/6 text-white/15 pointer-events-none'
                  : 'border-white/15 text-white/50 hover:border-white/30 hover:text-white/80'
              }`}
            >
              ← Previous
            </Link>
            <p className="text-xs text-white/30 tabular-nums">
              Page <span className="text-white/55 font-semibold">{page}</span> of{' '}
              <span className="text-white/55 font-semibold">{totalPages}</span>
            </p>
            <Link
              href={`/admin/freight-rates?page=${page + 1}`}
              aria-disabled={page >= totalPages}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all duration-150 ${
                page >= totalPages
                  ? 'border-white/6 text-white/15 pointer-events-none'
                  : 'border-white/15 text-white/50 hover:border-white/30 hover:text-white/80'
              }`}
            >
              Next →
            </Link>
          </div>
        )}
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
