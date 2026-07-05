import { adminSupabase } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import NotifyButton from '@/components/admin/NotifyButton'
import AdminMobileNav from '@/components/AdminMobileNav'
import logo from '@/assests/img/logo.jpg'

function machineStatusBadge(status: string): string {
  switch (status) {
    case 'pending_hold':    return 'bg-amber-500/20 border-amber-500/30 text-amber-400'
    case 'reserved':        return 'bg-amber-500/20 border-amber-500/30 text-amber-400'
    case 'payment_pending': return 'bg-orange-500/20 border-orange-500/30 text-orange-400'
    case 'sold':            return 'bg-red-500/20 border-red-500/30 text-red-400'
    default:                return 'bg-white/8 border-white/12 text-white/40'
  }
}

const TABS = [
  { label: 'Inventory',    href: '/admin/inventory' },
  { label: 'Quotes',       href: '/admin/quotes' },
  { label: 'Buyers',       href: '/admin/buyers' },
  { label: 'Waitlist',     href: '/admin/waitlist' },
  { label: 'Walkthroughs', href: '/admin/walkthroughs' },
  { label: 'Freight',      href: '/admin/freight-rates' },
  { label: 'Support',      href: '/admin/support' },
]

const PAGE_SIZE = 10

export default async function AdminWaitlistPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1', 10))

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) redirect('/auth/login')

  const { data: allWatchlist } = await adminSupabase
    .from('watchlist')
    .select(`
      buyer_id, machine_id, arrival_alert_params, created_at,
      machines(id, name, brand, model, year, category, status),
      buyers(id, email, company_name)
    `)
    .order('created_at', { ascending: false })

  const waitlist = (allWatchlist ?? []).filter(w => {
    const m = w.machines as unknown as { status: string } | null
    return (m && m.status !== 'available') || w.arrival_alert_params != null
  })

  const total = waitlist.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const offset = (page - 1) * PAGE_SIZE
  const pageItems = waitlist.slice(offset, offset + PAGE_SIZE)

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col">

      {/* ── STICKY NAV ── */}
      <header className="sticky top-0 z-50 bg-navy-950/96 backdrop-blur-md border-b border-white/8">
        <div className="px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Image src={logo} alt="BlueRock Equipment" className="h-9 w-auto object-contain invert opacity-90" />
            </Link>
            <div className="hidden sm:block h-5 w-px bg-white/10" />
            <div className="hidden sm:block">
              <h1 className="font-display text-base font-bold text-white leading-tight">BlueRock Admin</h1>
              <p className="text-[10px] text-gold-400 font-semibold uppercase tracking-widest">Waitlist</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/machines"
              className="text-xs font-semibold text-gold-400 hover:text-gold-300 border border-gold-400/30 hover:border-gold-400/55 px-3 py-1.5 rounded-lg transition-all duration-150 hidden sm:inline-flex"
            >
              View Public Site →
            </Link>
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
              const isActive = tab.href === '/admin/waitlist'
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

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col gap-8">

        {/* ── SECTION HEADER ── */}
        <div className="flex items-center gap-3">
          <p className="text-[10px] font-bold text-gold-400 uppercase tracking-widest">
            Waitlist &amp; Arrival Alerts
          </p>
          {total > 0 && (
            <span className="text-[10px] text-gold-400 bg-gold-400/12 border border-gold-400/20 px-2 py-0.5 rounded-full font-semibold">
              {total} buyer{total !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* ── TABLE ── */}
        {total === 0 ? (
          <div className="bg-navy-900 border border-white/8 rounded-2xl p-10 text-center">
            <p className="text-white/25 text-sm mb-1">
              No buyers are currently waiting on held or sold machines.
            </p>
            <p className="text-white/15 text-xs">
              This section populates when buyers save machines that become pending or sold.
            </p>
          </div>
        ) : (
          <div className="bg-navy-900 border border-white/8 rounded-2xl overflow-hidden">
            {/* Info banner */}
            <div className="bg-amber-500/8 border-b border-amber-500/15 px-5 py-3.5">
              <p className="text-xs text-amber-400 leading-relaxed">
                These buyers saved machines that are now held or sold. Use &ldquo;Notify&rdquo; to email them when a similar machine is available.
              </p>
            </div>

            <div className="overflow-x-auto scrollbar-hide">
              <table className="w-full text-sm min-w-[760px]">
                <thead>
                  <tr className="border-b border-white/8 bg-navy-800">
                    <th className="px-5 py-4 text-left text-[10px] font-bold text-white/35 uppercase tracking-widest">Buyer</th>
                    <th className="px-5 py-4 text-left text-[10px] font-bold text-white/35 uppercase tracking-widest">Machine They Saved</th>
                    <th className="px-5 py-4 text-left text-[10px] font-bold text-white/35 uppercase tracking-widest hidden md:table-cell">Category</th>
                    <th className="px-5 py-4 text-left text-[10px] font-bold text-white/35 uppercase tracking-widest">Machine Status</th>
                    <th className="px-5 py-4 text-left text-[10px] font-bold text-white/35 uppercase tracking-widest hidden xl:table-cell">Alert Params</th>
                    <th className="px-5 py-4 text-left text-[10px] font-bold text-white/35 uppercase tracking-widest">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((w, i) => {
                    const m = w.machines as unknown as {
                      id: string; name?: string; brand: string; model: string
                      year: number; category: string; status: string
                    } | null
                    const b = w.buyers as unknown as {
                      id: string; email: string; company_name: string | null
                    } | null
                    const machineName = m?.name ?? (m ? `${m.year} ${m.brand} ${m.model}` : '—')

                    return (
                      <tr
                        key={`${w.buyer_id}-${w.machine_id}`}
                        className={`border-b border-white/5 last:border-0 hover:bg-white/4 transition-colors duration-100 ${
                          i % 2 === 1 ? 'bg-white/[0.02]' : ''
                        }`}
                      >
                        {/* Buyer */}
                        <td className="px-5 py-4">
                          <p className="font-semibold text-white/80 text-sm leading-tight">
                            {b?.company_name || <span className="text-white/30 font-normal italic">No company</span>}
                          </p>
                          <p className="text-[11px] text-white/35 mt-0.5">{b?.email}</p>
                        </td>

                        {/* Machine */}
                        <td className="px-5 py-4">
                          {m ? (
                            <Link
                              href={`/machines/${m.id}`}
                              target="_blank"
                              className="text-white/65 hover:text-gold-300 text-sm font-medium transition-colors duration-150"
                            >
                              {machineName}
                            </Link>
                          ) : (
                            <span className="text-white/25">—</span>
                          )}
                        </td>

                        {/* Category */}
                        <td className="px-5 py-4 text-white/45 text-xs hidden md:table-cell">
                          {m?.category ?? '—'}
                        </td>

                        {/* Machine status */}
                        <td className="px-5 py-4">
                          {m?.status ? (
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wide whitespace-nowrap ${machineStatusBadge(m.status)}`}>
                              {m.status.replace(/_/g, ' ')}
                            </span>
                          ) : (
                            <span className="text-white/20">—</span>
                          )}
                        </td>

                        {/* Alert params */}
                        <td className="px-5 py-4 hidden xl:table-cell">
                          {w.arrival_alert_params ? (
                            <span className="text-[11px] text-white/40 font-mono">
                              {JSON.stringify(w.arrival_alert_params)}
                            </span>
                          ) : (
                            <span className="text-white/20 text-xs italic">none</span>
                          )}
                        </td>

                        {/* Action */}
                        <td className="px-5 py-4">
                          {b && m ? (
                            <NotifyButton
                              buyerId={b.id}
                              buyerEmail={b.email}
                              companyName={b.company_name}
                              machineName={machineName}
                              machineCategory={m.category}
                            />
                          ) : (
                            <span className="text-white/20">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer count */}
            <div className="px-5 py-3 border-t border-white/6">
              <p className="text-[11px] text-white/25">
                {total} buyer{total !== 1 ? 's' : ''} on waitlist
              </p>
            </div>

            {/* Pagination — show when 5+ items */}
            {total >= 5 && (
              <div className="flex items-center justify-between px-5 py-3.5 border-t border-white/6">
                <Link
                  href={`/admin/waitlist?page=${page - 1}`}
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
                  href={`/admin/waitlist?page=${page + 1}`}
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
          </div>
        )}

      </main>

      {/* ── FOOTER ── */}
      <footer className="bg-navy-950 border-t border-white/5 py-6 px-6 mt-auto">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <p className="text-xs text-white/20">BlueRock Equipment — Admin Operations</p>
          <Link href="/admin" className="text-xs text-white/25 hover:text-white/50 transition-colors duration-150">
            ← Admin Dashboard
          </Link>
        </div>
      </footer>
    </div>
  )
}
