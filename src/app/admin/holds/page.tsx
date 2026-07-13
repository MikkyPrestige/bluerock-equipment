import { adminSupabase } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import AdminMobileNav from '@/components/AdminMobileNav'
import ReleaseHoldButton from '@/components/admin/ReleaseHoldButton'
import { ACTIVE_QUOTE_STATUSES } from '@/lib/milestones'
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

const STATUS_LABEL: Record<string, string> = {
  pending_quote:      'Pending Quote',
  invoice_generated:  'Invoice Generated',
  revision_requested: 'Revision Requested',
  buyer_accepted:     'Buyer Accepted',
  payment_pending:    'Payment Pending',
  payment_confirmed:  'Payment Confirmed',
}

const PAGE_SIZE = 10

export default async function AdminHoldsPage({
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

  const { data: allHeld, count: totalCount } = await adminSupabase
    .from('machines')
    .select('id, name, brand, model, status, updated_at', { count: 'exact' })
    .in('status', ['pending_hold', 'reserved'])
    .order('updated_at', { ascending: true })

  const total = totalCount ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const pageMachines = (allHeld ?? []).slice(offset, offset + PAGE_SIZE)
  const machineIds = pageMachines.map(m => m.id)

  const { data: relatedQuotes } = machineIds.length > 0
    ? await adminSupabase
        .from('quotes')
        .select('id, machine_id, status, lock_expires_at, created_at, buyers(email, company_name)')
        .in('machine_id', machineIds)
        .order('created_at', { ascending: false })
    : { data: [] }

  type RelatedQuote = {
    id: string
    machine_id: string
    status: string
    lock_expires_at: string | null
    created_at: string
    buyers: { email: string; company_name: string | null } | null
  }

  // For each held machine, the quote actually responsible for the hold is
  // the most recent one still in an active status — a machine can only be
  // locked by one live quote at a time (create_quote_with_lock requires
  // status='available' before it will ever hand out a new one). If none of
  // a machine's quotes are active, the hold is orphaned: something released
  // the quote (buyer cancellation past pending_quote is the known gap — see
  // report) without ever releasing the machine.
  const holdingQuoteByMachine = new Map<string, RelatedQuote>();
  for (const q of (relatedQuotes ?? []) as unknown as RelatedQuote[]) {
    if (!(ACTIVE_QUOTE_STATUSES as readonly string[]).includes(q.status)) continue
    if (!holdingQuoteByMachine.has(q.machine_id)) holdingQuoteByMachine.set(q.machine_id, q)
  }

  const now = Date.now()

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
              <p className="text-[10px] text-gold-400 font-semibold uppercase tracking-widest">Lock Expiry Watchdog</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-xs text-white/35 hover:text-white/65 transition-colors duration-150 hidden sm:inline">
              Dashboard
            </Link>
            <AdminMobileNav />
          </div>
        </div>

        <div className="hidden sm:block px-6 overflow-x-auto scrollbar-hide">
          <div className="flex items-center min-w-max border-t border-white/6">
            {TABS.map(tab => {
              const isActive = tab.href === '/admin/holds'
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

        {/* ── SECTION HEADER ── */}
        <div className="flex items-center gap-3">
          <p className="text-[10px] font-bold text-gold-400 uppercase tracking-widest">
            Machines Currently Held
          </p>
          {total > 0 && (
            <span className="text-[10px] text-gold-400 bg-gold-400/12 border border-gold-400/20 px-2 py-0.5 rounded-full font-semibold">
              {total}
            </span>
          )}
        </div>
        <p className="text-white/30 text-xs -mt-4">
          Every machine at pending_hold or reserved, regardless of whether its lock is still live, expired, or its quote
          was already cancelled without releasing the machine. Release clears the hold immediately — it does not wait
          on or require any action from the buyer.
        </p>

        {/* ── TABLE ── */}
        {total === 0 ? (
          <div className="bg-navy-900 border border-white/8 rounded-2xl p-10 text-center">
            <p className="text-white/25 text-sm mb-1">No machines are currently held.</p>
            <p className="text-white/15 text-xs">Every machine is either available or sold.</p>
          </div>
        ) : (
          <div className="bg-navy-900 border border-white/8 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto scrollbar-hide">
              <table className="w-full text-sm min-w-[860px]">
                <thead>
                  <tr className="border-b border-white/8 bg-navy-800">
                    <th className="px-5 py-4 text-left text-[10px] font-bold text-white/35 uppercase tracking-widest">Machine</th>
                    <th className="px-5 py-4 text-left text-[10px] font-bold text-white/35 uppercase tracking-widest">Buyer</th>
                    <th className="px-5 py-4 text-left text-[10px] font-bold text-white/35 uppercase tracking-widest">Quote Status</th>
                    <th className="px-5 py-4 text-left text-[10px] font-bold text-white/35 uppercase tracking-widest">Lock</th>
                    <th className="px-5 py-4 text-left text-[10px] font-bold text-white/35 uppercase tracking-widest">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pageMachines.map((m, i) => {
                    const holdingQuote = holdingQuoteByMachine.get(m.id)
                    const buyer = holdingQuote?.buyers ?? null
                    const machineName = m.name || `${m.brand} ${m.model}`

                    const lockDate  = holdingQuote?.lock_expires_at ? new Date(holdingQuote.lock_expires_at) : null
                    const isExpired = lockDate ? lockDate.getTime() < now : false
                    const hoursDiff = lockDate ? Math.abs(lockDate.getTime() - now) / 3600000 : null

                    return (
                      <tr
                        key={m.id}
                        className={`border-b border-white/5 last:border-0 hover:bg-white/4 transition-colors duration-100 ${
                          i % 2 === 1 ? 'bg-white/[0.02]' : ''
                        }`}
                      >
                        {/* Machine */}
                        <td className="px-5 py-4">
                          <Link href={`/machines/${m.id}`} target="_blank" className="group">
                            <p className="font-semibold text-white/85 text-sm leading-tight group-hover:text-gold-300 transition-colors">
                              {machineName}
                            </p>
                          </Link>
                          <p className="text-[10px] text-white/25 mt-0.5 uppercase tracking-wide">{m.status.replace(/_/g, ' ')}</p>
                        </td>

                        {/* Buyer */}
                        <td className="px-5 py-4">
                          {buyer ? (
                            <>
                              <p className="font-semibold text-white/75 text-sm leading-tight">
                                {buyer.company_name || <span className="text-white/30 font-normal italic">No company</span>}
                              </p>
                              <p className="text-[11px] text-white/35 mt-0.5">{buyer.email}</p>
                            </>
                          ) : (
                            <span className="text-white/25 text-xs italic">No active quote</span>
                          )}
                        </td>

                        {/* Quote Status */}
                        <td className="px-5 py-4">
                          {holdingQuote ? (
                            <Link
                              href={`/admin/quotes/${holdingQuote.id}`}
                              className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors duration-150"
                            >
                              {STATUS_LABEL[holdingQuote.status] ?? holdingQuote.status} →
                            </Link>
                          ) : (
                            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wide bg-rose-500/15 border-rose-500/25 text-rose-400 whitespace-nowrap">
                              Orphaned hold
                            </span>
                          )}
                        </td>

                        {/* Lock */}
                        <td className="px-5 py-4 text-xs whitespace-nowrap">
                          {!holdingQuote ? (
                            <span className="text-white/20">
                              Held since {new Date(m.updated_at).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                            </span>
                          ) : lockDate ? (
                            <span className={isExpired ? 'text-red-400' : hoursDiff !== null && hoursDiff <= 12 ? 'text-amber-400' : 'text-white/50'}>
                              {isExpired
                                ? `Expired ${Math.ceil(hoursDiff ?? 0)}h ago`
                                : `${Math.ceil(hoursDiff ?? 0)}h remaining`}
                            </span>
                          ) : (
                            <span className="text-white/20">—</span>
                          )}
                        </td>

                        {/* Action */}
                        <td className="px-5 py-4">
                          <ReleaseHoldButton machineId={m.id} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-5 py-3 border-t border-white/6">
              <p className="text-[11px] text-white/25">{total} machine{total !== 1 ? 's' : ''} held</p>
            </div>

            {total >= 5 && (
              <div className="flex items-center justify-between px-5 py-3.5 border-t border-white/6">
                <Link
                  href={`/admin/holds?page=${page - 1}`}
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
                  href={`/admin/holds?page=${page + 1}`}
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
