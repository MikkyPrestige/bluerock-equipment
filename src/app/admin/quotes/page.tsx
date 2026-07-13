import { adminSupabase } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import AdminMobileNav from '@/components/AdminMobileNav'
import ArchiveQuoteButton from '@/components/admin/ArchiveQuoteButton'
import logo from '@/assests/img/logo.jpg'

/* ── Status badge (dark-adapted) ── */
const STATUS: Record<string, { label: string; badge: string }> = {
  pending_quote:      { label: 'Pending Quote',      badge: 'bg-amber-500/20 border-amber-500/30 text-amber-400' },
  invoice_generated:  { label: 'Invoice Generated',  badge: 'bg-blue-500/20 border-blue-500/30 text-blue-400' },
  revision_requested: { label: 'Revision Requested', badge: 'bg-rose-500/20 border-rose-500/30 text-rose-400' },
  buyer_accepted:     { label: 'Buyer Accepted',     badge: 'bg-blue-500/20 border-blue-500/30 text-blue-400' },
  payment_pending:    { label: 'Payment Pending',    badge: 'bg-orange-500/20 border-orange-500/30 text-orange-400' },
  payment_confirmed:  { label: 'Payment Confirmed',  badge: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' },
  sold:               { label: 'Sold',               badge: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' },
  cancelled:          { label: 'Cancelled',          badge: 'bg-white/8 border-white/12 text-white/30' },
}

/* ── Admin sub-nav tabs ── */
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

export default async function AdminQuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; archived?: string }>
}) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1', 10))
  const offset = (page - 1) * PAGE_SIZE
  const showArchived = params.archived === '1'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) redirect('/auth/login')

  // Archiving is purely an admin view-declutter concern, orthogonal to
  // status — every count and the list itself are scoped to whichever view
  // (active vs archived) is currently selected, so stats and pagination
  // never mix the two.
  const [
    { count: totalCount },
    { count: pendingCount },
    { count: activeCount },
    { count: completeCount },
    { count: archivedCount },
    { data: quotes },
  ] = await Promise.all([
    showArchived
      ? adminSupabase.from('quotes').select('*', { count: 'exact', head: true }).not('archived_at', 'is', null)
      : adminSupabase.from('quotes').select('*', { count: 'exact', head: true }).is('archived_at', null),
    showArchived
      ? adminSupabase.from('quotes').select('*', { count: 'exact', head: true }).in('status', ['pending_quote', 'revision_requested']).not('archived_at', 'is', null)
      : adminSupabase.from('quotes').select('*', { count: 'exact', head: true }).in('status', ['pending_quote', 'revision_requested']).is('archived_at', null),
    showArchived
      ? adminSupabase.from('quotes').select('*', { count: 'exact', head: true }).neq('status', 'sold').neq('status', 'cancelled').not('archived_at', 'is', null)
      : adminSupabase.from('quotes').select('*', { count: 'exact', head: true }).neq('status', 'sold').neq('status', 'cancelled').is('archived_at', null),
    showArchived
      ? adminSupabase.from('quotes').select('*', { count: 'exact', head: true }).eq('status', 'sold').not('archived_at', 'is', null)
      : adminSupabase.from('quotes').select('*', { count: 'exact', head: true }).eq('status', 'sold').is('archived_at', null),
    adminSupabase.from('quotes').select('*', { count: 'exact', head: true }).not('archived_at', 'is', null),
    showArchived
      ? adminSupabase
          .from('quotes')
          .select('*, machines(name, brand, model, price_usd), buyers(company_name, email)')
          .not('archived_at', 'is', null)
          .order('created_at', { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1)
      : adminSupabase
          .from('quotes')
          .select('*, machines(name, brand, model, price_usd), buyers(company_name, email)')
          .is('archived_at', null)
          .order('created_at', { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1),
  ])

  const total      = totalCount    ?? 0
  const pending    = pendingCount  ?? 0
  const active     = activeCount   ?? 0
  const complete   = completeCount ?? 0
  const archived   = archivedCount ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const pageQuery  = showArchived ? '&archived=1' : ''

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col">

      {/* ── STICKY NAV ── */}
      <header className="sticky top-0 z-50 bg-navy-950/96 backdrop-blur-md border-b border-white/8">
        {/* Top row */}
        <div className="px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Image src={logo} alt="BlueRock Equipment" className="h-9 w-auto object-contain invert opacity-90" />
            </Link>
            <div className="hidden sm:block h-5 w-px bg-white/10" />
            <div className="hidden sm:block">
              <h1 className="font-display text-base font-bold text-white leading-tight">BlueRock Admin</h1>
              <p className="text-[10px] text-gold-400 font-semibold uppercase tracking-widest">Quotes</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/machines"
              className="text-xs font-semibold text-gold-400 hover:text-gold-300 border border-gold-400/30 hover:border-gold-400/55 px-3 py-1.5 rounded-lg transition-all duration-150 hidden sm:inline-flex"
            >
              View Public Site →
            </Link>
            <Link href="/admin" className="text-xs text-white/35 hover:text-white/65 transition-colors duration-150">
              Dashboard
            </Link>
            <AdminMobileNav />
          </div>
        </div>

        {/* Tab bar */}
        <div className="hidden sm:block px-6 overflow-x-auto scrollbar-hide">
          <div className="flex items-center min-w-max border-t border-white/6">
            {TABS.map(tab => {
              const isActive = tab.href === '/admin/quotes'
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

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col gap-6">

        {/* ── STATS BAR ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: showArchived ? 'Archived Quotes' : 'Total Quotes', value: total },
            { label: 'Needs Action',  value: pending,  urgent: !showArchived && pending > 0 },
            { label: 'Active',        value: active    },
            { label: 'Completed',     value: complete  },
          ].map(({ label, value, urgent }) => (
            <div
              key={label}
              className={`border rounded-xl px-4 py-3 text-center ${
                urgent
                  ? 'bg-amber-500/8 border-amber-500/20'
                  : 'bg-navy-900 border-white/8'
              }`}
            >
              <p className={`font-display text-2xl font-bold ${urgent ? 'text-amber-400' : 'text-gold-400'}`}>
                {value}
              </p>
              <p className="text-[10px] text-white/30 uppercase tracking-widest mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* ── ARCHIVED VIEW TOGGLE ── */}
        <div className="flex items-center justify-end">
          {showArchived ? (
            <Link
              href="/admin/quotes"
              className="text-xs font-semibold text-gold-400 hover:text-gold-300 transition-colors duration-150"
            >
              ← Back to Active Quotes
            </Link>
          ) : (
            <Link
              href="/admin/quotes?archived=1"
              className="text-xs font-semibold text-white/35 hover:text-white/65 transition-colors duration-150"
            >
              View Archived ({archived})
            </Link>
          )}
        </div>

        {/* ── EMPTY STATE ── */}
        {total === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-32">
            <div className="text-white/10 text-7xl mb-6">📋</div>
            <p className="text-white/35 text-base mb-2">
              {showArchived ? 'No archived quotes.' : 'No quotes yet.'}
            </p>
            <p className="text-white/20 text-sm">
              {showArchived
                ? 'Quotes you archive to declutter this view will show up here.'
                : 'Quote requests from buyers will appear here.'}
            </p>
          </div>
        ) : (
          /* ── TABLE ── */
          <div className="bg-navy-900 border border-white/8 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto scrollbar-hide">
              <table className="w-full text-sm min-w-[860px]">

                {/* Header */}
                <thead>
                  <tr className="border-b border-white/8 bg-navy-800">
                    <th className="px-5 py-4 text-left text-[10px] font-bold text-white/35 uppercase tracking-widest">Quote ID</th>
                    <th className="px-5 py-4 text-left text-[10px] font-bold text-white/35 uppercase tracking-widest">Buyer</th>
                    <th className="px-5 py-4 text-left text-[10px] font-bold text-white/35 uppercase tracking-widest hidden md:table-cell">Machine</th>
                    <th className="px-5 py-4 text-left text-[10px] font-bold text-white/35 uppercase tracking-widest">Total USD</th>
                    <th className="px-5 py-4 text-left text-[10px] font-bold text-white/35 uppercase tracking-widest">Status</th>
                    <th className="px-5 py-4 text-left text-[10px] font-bold text-white/35 uppercase tracking-widest hidden lg:table-cell">Lock Expires</th>
                    <th className="px-5 py-4 text-left text-[10px] font-bold text-white/35 uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>

                {/* Rows */}
                <tbody>
                  {(quotes ?? []).map((q, i) => {
                    const machine = q.machines as { name?: string; brand: string; model: string; price_usd: number } | null
                    const buyer   = q.buyers   as { company_name: string | null; email: string } | null
                    const s       = STATUS[q.status] ?? { label: q.status.replace(/_/g, ' '), badge: 'bg-white/8 border-white/12 text-white/40' }

                    const machineName = machine?.name || (machine ? `${machine.brand} ${machine.model}` : '—')

                    const lockDate    = q.lock_expires_at ? new Date(q.lock_expires_at) : null
                    const now         = Date.now()
                    const isExpired   = lockDate ? lockDate.getTime() < now : false
                    const hoursLeft   = lockDate ? (lockDate.getTime() - now) / 3600000 : null

                    const lockTextClass = isExpired
                      ? 'text-red-400'
                      : hoursLeft !== null && hoursLeft <= 24
                        ? 'text-gold-400'
                        : 'text-white/50'

                    const displayPrice = q.total_amount
                      ? `$${Number(q.total_amount).toLocaleString()}`
                      : null

                    return (
                      <tr
                        key={q.id}
                        className={`border-b border-white/5 last:border-0 hover:bg-white/4 transition-colors duration-100 ${
                          i % 2 === 1 ? 'bg-white/[0.02]' : ''
                        }`}
                      >
                        {/* Quote ID */}
                        <td className="px-5 py-4 font-mono text-[11px] text-white/35 whitespace-nowrap">
                          PRF-{q.id.slice(0, 8).toUpperCase()}
                        </td>

                        {/* Buyer */}
                        <td className="px-5 py-4">
                          <p className="font-semibold text-white/85 text-sm leading-tight">
                            {buyer?.company_name || <span className="text-white/30 font-normal italic">No company</span>}
                          </p>
                          <p className="text-[11px] text-white/35 mt-0.5">{buyer?.email ?? '—'}</p>
                        </td>

                        {/* Machine — hidden below md */}
                        <td className="px-5 py-4 text-white/65 text-sm hidden md:table-cell max-w-[200px] truncate">
                          {machineName}
                        </td>

                        {/* Total */}
                        <td className="px-5 py-4 tabular-nums whitespace-nowrap">
                          {displayPrice
                            ? <span className="text-gold-400 font-semibold">{displayPrice}</span>
                            : <span className="text-white/25 text-xs italic">
                                {machine ? `$${Number(machine.price_usd).toLocaleString()} + freight` : 'TBD'}
                              </span>
                          }
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wide whitespace-nowrap ${s.badge}`}>
                            {s.label}
                          </span>
                        </td>

                        {/* Lock Expires — hidden below lg */}
                        <td className={`px-5 py-4 text-xs whitespace-nowrap hidden lg:table-cell ${lockTextClass}`}>
                          {lockDate ? (
                            <>
                              {lockDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              {' '}
                              {lockDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                              {isExpired && <span className="ml-1 text-[10px]">(expired)</span>}
                              {!isExpired && hoursLeft !== null && hoursLeft <= 24 && (
                                <span className="ml-1 text-[10px]">({Math.ceil(hoursLeft)}h left)</span>
                              )}
                            </>
                          ) : (
                            <span className="text-white/20">—</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <Link
                              href={`/admin/quotes/${q.id}`}
                              className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors duration-150"
                            >
                              Open →
                            </Link>
                            <ArchiveQuoteButton quoteId={q.id} archived={!!q.archived_at} />
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Table footer */}
            <div className="px-5 py-3 border-t border-white/6 flex items-center justify-between">
              <p className="text-[11px] text-white/25">
                {total} {showArchived ? 'archived ' : ''}quote{total !== 1 ? 's' : ''} total
              </p>
              {!showArchived && pending > 0 && (
                <p className="text-[11px] text-amber-400 font-semibold">
                  {pending} awaiting your response
                </p>
              )}
            </div>
            {total >= 5 && (
              <div className="flex items-center justify-between px-5 py-3.5 border-t border-white/6">
                <Link
                  href={`/admin/quotes?page=${page - 1}${pageQuery}`}
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
                  href={`/admin/quotes?page=${page + 1}${pageQuery}`}
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
