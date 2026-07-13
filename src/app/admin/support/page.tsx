import { adminSupabase } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import AdminMobileNav from '@/components/AdminMobileNav'
import { SUPPORT_STATUS_LABELS, SUPPORT_STATUS_BADGE, SUPPORT_STATUSES } from '@/lib/support'
import logo from '@/assests/img/logo.jpg'

const TABS = [
  { label: 'Inventory',    href: '/admin/inventory' },
  { label: 'Quotes',       href: '/admin/quotes' },
  { label: 'Buyers',       href: '/admin/buyers' },
  { label: 'Waitlist',     href: '/admin/waitlist' },
  { label: 'Holds',        href: '/admin/holds' },
  { label: 'Walkthroughs', href: '/admin/walkthroughs' },
  { label: 'Freight',      href: '/admin/freight-rates' },
  { label: 'Support',      href: '/admin/support' },
]

const PAGE_SIZE = 10

export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>
}) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1', 10))
  const offset = (page - 1) * PAGE_SIZE
  const statusFilter = params.status && (SUPPORT_STATUSES as readonly string[]).includes(params.status)
    ? params.status
    : null

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) redirect('/auth/login')

  let listQuery = adminSupabase
    .from('support_tickets')
    .select('id, subject, status, admin_last_read_at, updated_at, buyers(company_name, email)', { count: 'exact' })
    .order('updated_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (statusFilter) listQuery = listQuery.eq('status', statusFilter)

  const [
    { count: totalCount },
    { count: openCount },
    { count: repliedCount },
    { count: resolvedCount },
    { count: closedCount },
    { data: tickets, count: filteredCount, error: listError },
  ] = await Promise.all([
    adminSupabase.from('support_tickets').select('*', { count: 'exact', head: true }),
    adminSupabase.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    adminSupabase.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'replied'),
    adminSupabase.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'resolved'),
    adminSupabase.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'closed'),
    listQuery,
  ])

  const total = filteredCount ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  /* Latest buyer message per ticket on this page — drives the unread dot. */
  const ticketIds = (tickets ?? []).map(t => t.id)
  const lastBuyerMsgAt: Record<string, string> = {}
  if (ticketIds.length > 0) {
    const { data: buyerMsgs } = await adminSupabase
      .from('support_messages')
      .select('ticket_id, created_at')
      .in('ticket_id', ticketIds)
      .eq('sender_type', 'buyer')
      .order('created_at', { ascending: false })
    for (const m of buyerMsgs ?? []) {
      if (!lastBuyerMsgAt[m.ticket_id]) lastBuyerMsgAt[m.ticket_id] = m.created_at
    }
  }

  function pageHref(p: number) {
    const sp = new URLSearchParams()
    if (statusFilter) sp.set('status', statusFilter)
    sp.set('page', String(p))
    return `/admin/support?${sp.toString()}`
  }

  function filterHref(status: string | null) {
    const sp = new URLSearchParams()
    if (status) sp.set('status', status)
    return `/admin/support?${sp.toString()}`
  }

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
              <p className="text-[10px] text-gold-400 font-semibold uppercase tracking-widest">Support Tickets</p>
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
              const isActive = tab.href === '/admin/support'
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: 'Total Tickets', value: totalCount    ?? 0 },
            { label: 'Open',          value: openCount      ?? 0, urgent: (openCount ?? 0) > 0 },
            { label: 'Replied',       value: repliedCount   ?? 0 },
            { label: 'Resolved',      value: resolvedCount  ?? 0 },
            { label: 'Closed',        value: closedCount    ?? 0 },
          ].map(({ label, value, urgent }) => (
            <div
              key={label}
              className={`border rounded-xl px-4 py-3 text-center ${
                urgent ? 'bg-amber-500/8 border-amber-500/20' : 'bg-navy-900 border-white/8'
              }`}
            >
              <p className={`font-display text-2xl font-bold ${urgent ? 'text-amber-400' : 'text-gold-400'}`}>
                {value}
              </p>
              <p className="text-[10px] text-white/30 uppercase tracking-widest mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* ── STATUS FILTER ── */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={filterHref(null)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all duration-150 ${
              !statusFilter
                ? 'bg-gold-400/15 border-gold-400/40 text-gold-400'
                : 'border-white/12 text-white/40 hover:border-white/30 hover:text-white/70'
            }`}
          >
            All
          </Link>
          {SUPPORT_STATUSES.map(s => (
            <Link
              key={s}
              href={filterHref(s)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all duration-150 ${
                statusFilter === s
                  ? 'bg-gold-400/15 border-gold-400/40 text-gold-400'
                  : 'border-white/12 text-white/40 hover:border-white/30 hover:text-white/70'
              }`}
            >
              {SUPPORT_STATUS_LABELS[s]}
            </Link>
          ))}
        </div>

        {/* ── TABLE ── */}
        {listError ? (
          <div className="bg-navy-900 border border-white/8 rounded-2xl p-10 text-center">
            <p className="text-white/30 text-sm mb-1">We couldn&apos;t load support tickets.</p>
            <p className="text-white/15 text-xs">Please refresh the page and try again.</p>
          </div>
        ) : total === 0 ? (
          <div className="bg-navy-900 border border-white/8 rounded-2xl p-10 text-center">
            <p className="text-white/25 text-sm mb-1">No support tickets{statusFilter ? ` with status “${SUPPORT_STATUS_LABELS[statusFilter]}”` : ''}.</p>
            <p className="text-white/15 text-xs">Buyer-submitted tickets will appear here.</p>
          </div>
        ) : (
          <div className="bg-navy-900 border border-white/8 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto scrollbar-hide">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="border-b border-white/8 bg-navy-800">
                    <th className="px-5 py-4 text-left text-[10px] font-bold text-white/35 uppercase tracking-widest">Subject</th>
                    <th className="px-5 py-4 text-left text-[10px] font-bold text-white/35 uppercase tracking-widest">Buyer</th>
                    <th className="px-5 py-4 text-left text-[10px] font-bold text-white/35 uppercase tracking-widest">Status</th>
                    <th className="px-5 py-4 text-left text-[10px] font-bold text-white/35 uppercase tracking-widest hidden sm:table-cell">Last Activity</th>
                    <th className="px-5 py-4 text-left text-[10px] font-bold text-white/35 uppercase tracking-widest">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(tickets ?? []).map((t, i) => {
                    const buyer = t.buyers as unknown as { company_name: string | null; email: string } | null
                    const badge = SUPPORT_STATUS_BADGE[t.status] ?? 'bg-white/8 border-white/12 text-white/40'
                    const label = SUPPORT_STATUS_LABELS[t.status] ?? t.status
                    const lastMsg = lastBuyerMsgAt[t.id]
                    const isUnread = !!lastMsg && (!t.admin_last_read_at || new Date(lastMsg) > new Date(t.admin_last_read_at))
                    return (
                      <tr
                        key={t.id}
                        className={`border-b border-white/5 last:border-0 hover:bg-white/4 transition-colors duration-100 ${
                          i % 2 === 1 ? 'bg-white/[0.02]' : ''
                        }`}
                      >
                        <td className="px-5 py-4 text-white/85 font-medium text-sm max-w-[260px]">
                          <div className="flex items-center gap-2">
                            {isUnread && (
                              <span className="w-1.5 h-1.5 rounded-full bg-gold-400 flex-shrink-0" title="Unread buyer message" />
                            )}
                            <span className="truncate">{t.subject}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-white/70 text-sm leading-tight">
                            {buyer?.company_name || <span className="text-white/30 italic">No company</span>}
                          </p>
                          <p className="text-[11px] text-white/35 mt-0.5">{buyer?.email}</p>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wide whitespace-nowrap ${badge}`}>
                            {label}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-white/30 text-xs hidden sm:table-cell whitespace-nowrap">
                          {new Date(t.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </td>
                        <td className="px-5 py-4">
                          <Link
                            href={`/admin/support/${t.id}`}
                            className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors duration-150"
                          >
                            Open →
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-5 py-3 border-t border-white/6">
              <p className="text-[11px] text-white/25">
                {total} ticket{total !== 1 ? 's' : ''}{statusFilter ? ` · ${SUPPORT_STATUS_LABELS[statusFilter]}` : ''}
              </p>
            </div>

            {total >= 5 && (
              <div className="flex items-center justify-between px-5 py-3.5 border-t border-white/6">
                <Link
                  href={pageHref(page - 1)}
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
                  href={pageHref(page + 1)}
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
