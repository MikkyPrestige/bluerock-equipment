import { adminSupabase } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import logo               from '@/assests/img/logo.jpg'
import AdminMobileNav     from '@/components/AdminMobileNav'
import AddWalkthroughForm from '@/components/admin/AddWalkthroughForm'
import WalkthroughEditor  from '@/components/admin/WalkthroughEditor'

/* ── Status badge map ── */
const STATUS: Record<string, { label: string; badge: string }> = {
  scheduled: { label: 'Scheduled', badge: 'bg-blue-500/20 border-blue-500/30 text-blue-400' },
  completed: { label: 'Completed', badge: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' },
  cancelled: { label: 'Cancelled', badge: 'bg-white/8 border-white/12 text-white/30' },
  no_show:   { label: 'No Show',   badge: 'bg-amber-500/20 border-amber-500/30 text-amber-400' },
}

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

function fmtDate(iso: string) {
  const d = new Date(iso)
  return {
    weekday:  d.toLocaleDateString('en-US', { weekday: 'short' }),
    monthDay: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    time:     d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    full:     d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }),
  }
}

type WRow = {
  id: string
  status: string
  scheduled_at: string
  technician: string | null
  admin_notes: string | null
  calendly_event_url: string | null
  buyers: unknown
  machines: unknown
}

const PAGE_SIZE = 10

export default async function AdminWalkthroughsPage({
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

  const now    = new Date()
  const nowISO = now.toISOString()

  const [
    { data: upcomingRows },
    { count: totalAll },
    { count: completedCount },
    { count: noShowCount },
    { count: pastCount },
    { data: pastRows },
    { data: buyers },
    { data: machines },
  ] = await Promise.all([
    adminSupabase
      .from('walkthroughs')
      .select('*, buyers(id, email, company_name), machines(id, name, brand, model)')
      .gte('scheduled_at', nowISO)
      .eq('status', 'scheduled')
      .order('scheduled_at', { ascending: true }),
    adminSupabase.from('walkthroughs').select('*', { count: 'exact', head: true }),
    adminSupabase.from('walkthroughs').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    adminSupabase.from('walkthroughs').select('*', { count: 'exact', head: true }).eq('status', 'no_show'),
    adminSupabase.from('walkthroughs').select('*', { count: 'exact', head: true }).or(`scheduled_at.lt.${nowISO},status.neq.scheduled`),
    adminSupabase
      .from('walkthroughs')
      .select('*, buyers(id, email, company_name), machines(id, name, brand, model)')
      .or(`scheduled_at.lt.${nowISO},status.neq.scheduled`)
      .order('scheduled_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1),
    adminSupabase.from('buyers').select('id, email, company_name').order('company_name'),
    adminSupabase.from('machines').select('id, name, brand, model').neq('status', 'sold').order('name'),
  ])

  const upcoming   = (upcomingRows ?? []) as WRow[]
  const past       = (pastRows ?? []) as WRow[]
  const totalPages = Math.max(1, Math.ceil((pastCount ?? 0) / PAGE_SIZE))

  const buyerList   = (buyers ?? []).map(b => ({ id: b.id, email: b.email, company_name: b.company_name }))
  const machineList = (machines ?? []).map(m => {
    const mm = m as unknown as { id: string; name?: string; brand: string; model: string }
    return { id: mm.id, name: mm.name || `${mm.brand} ${mm.model}` }
  })

  const stats = [
    { label: 'Total',     value: totalAll ?? 0 },
    { label: 'Upcoming',  value: upcoming.length, accent: upcoming.length > 0 ? 'text-blue-400' : undefined },
    { label: 'Completed', value: completedCount ?? 0, accent: 'text-emerald-400' },
    { label: 'No Shows',  value: noShowCount ?? 0, accent: (noShowCount ?? 0) > 0 ? 'text-amber-400' : undefined },
  ]

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
              <p className="font-display text-sm font-bold text-white leading-none">Walkthrough Schedule</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="text-xs text-white/35 hover:text-white/65 transition-colors duration-150 hidden sm:inline"
            >
              Dashboard
            </Link>
            <div className="hidden sm:block h-4 w-px bg-white/10" />
            {/* Modal trigger — renders + Log Walkthrough button + overlay */}
            <AddWalkthroughForm buyers={buyerList} machines={machineList} />
            <AdminMobileNav />
          </div>
        </div>

        {/* Tab bar */}
        <div className="hidden sm:block px-6 overflow-x-auto scrollbar-hide">
          <div className="flex items-center min-w-max border-t border-white/6">
            {TABS.map(tab => {
              const isActive = tab.href === '/admin/walkthroughs'
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

      {/* ── STATS BAR ── */}
      <div className="bg-navy-900 border-b border-white/8 px-6 py-4">
        <div className="max-w-4xl mx-auto grid grid-cols-4 gap-4 sm:gap-8">
          {stats.map(s => (
            <div key={s.label} className="text-center">
              <p className={`font-display text-xl sm:text-2xl font-bold tabular-nums ${s.accent ?? 'text-white'}`}>
                {s.value}
              </p>
              <p className="text-[10px] text-white/30 uppercase tracking-widest mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 space-y-10">

        {/* ── UPCOMING ── */}
        <section>
          <h2 className="text-[10px] font-bold text-gold-400 uppercase tracking-widest mb-4">
            Upcoming ({upcoming.length})
          </h2>

          {upcoming.length === 0 ? (
            <div className="bg-navy-900 border border-white/8 rounded-2xl px-8 py-12 text-center">
              <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
                <svg className="w-5 h-5 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
                </svg>
              </div>
              <p className="text-sm font-medium text-white/50 mb-1">No upcoming walkthroughs scheduled</p>
              <p className="text-xs text-white/25 max-w-sm mx-auto leading-relaxed">
                Walkthroughs are logged manually after a buyer books via the machine detail page.
                Use &quot;+ Log Walkthrough&quot; above to add one.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {upcoming.map(w => {
                const { weekday, monthDay, time } = fmtDate(w.scheduled_at)
                const buyer   = w.buyers   as { id: string; email: string; company_name: string | null } | null
                const machine = w.machines as { id: string; name?: string; brand: string; model: string } | null
                const machineName = machine?.name ?? (machine ? `${machine.brand} ${machine.model}` : null)
                const st = STATUS[w.status] ?? { label: w.status, badge: 'bg-white/8 border-white/12 text-white/30' }

                return (
                  <div key={w.id} className="bg-navy-900 border border-white/8 rounded-2xl p-5 sm:p-6">
                    <div className="flex items-start gap-4 flex-wrap sm:flex-nowrap">

                      {/* Date callout */}
                      <div className="flex-shrink-0 bg-navy-800 border border-white/10 rounded-xl px-4 py-3 text-center min-w-[82px]">
                        <p className="text-[10px] font-bold text-gold-400 uppercase tracking-widest">{weekday}</p>
                        <p className="text-sm font-bold text-white leading-tight mt-0.5">{monthDay}</p>
                        <p className="text-gold-300 text-xs font-semibold mt-1">{time}</p>
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                          <div>
                            <p className="font-semibold text-white/90 leading-tight">
                              {buyer?.company_name || buyer?.email || 'Unknown buyer'}
                            </p>
                            {buyer?.company_name && (
                              <p className="text-xs text-white/35 mt-0.5">{buyer.email}</p>
                            )}
                          </div>
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wide flex-shrink-0 ${st.badge}`}>
                            {st.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 flex-wrap text-xs">
                          {machineName && machine && (
                            <Link
                              href={`/machines/${machine.id}`}
                              target="_blank"
                              className="text-white/45 hover:text-gold-300 transition-colors duration-150"
                            >
                              {machineName}
                            </Link>
                          )}
                          {w.technician && (
                            <span className="text-white/30">{w.technician}</span>
                          )}
                          {w.calendly_event_url && (
                            <a
                              href={w.calendly_event_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 transition-colors duration-150"
                            >
                              Booking link ↗
                            </a>
                          )}
                          {buyer && (
                            <Link
                              href={`/admin/buyers/${buyer.id}`}
                              className="text-gold-400/70 hover:text-gold-300 transition-colors duration-150"
                            >
                              Buyer profile →
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Inline editor */}
                    <WalkthroughEditor
                      id={w.id}
                      initialTechnician={w.technician}
                      initialStatus={w.status}
                      initialNotes={w.admin_notes}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* ── PAST & OTHER ── */}
        {(pastCount ?? 0) > 0 && (
          <section>
            <h2 className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-4">
              Past & Other ({pastCount ?? 0})
            </h2>

            <div className="bg-navy-900 border border-white/8 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto scrollbar-hide">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-white/8">
                      <th className="px-5 py-3 text-left text-[10px] font-bold text-white/30 uppercase tracking-widest">Buyer</th>
                      <th className="px-5 py-3 text-left text-[10px] font-bold text-white/30 uppercase tracking-widest hidden md:table-cell">Machine</th>
                      <th className="px-5 py-3 text-left text-[10px] font-bold text-white/30 uppercase tracking-widest">Scheduled</th>
                      <th className="px-5 py-3 text-left text-[10px] font-bold text-white/30 uppercase tracking-widest hidden lg:table-cell">Technician</th>
                      <th className="px-5 py-3 text-left text-[10px] font-bold text-white/30 uppercase tracking-widest">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {past.map((w, i) => {
                      const { full } = fmtDate(w.scheduled_at)
                      const buyer   = w.buyers   as { id: string; email: string; company_name: string | null } | null
                      const machine = w.machines as { id: string; name?: string; brand: string; model: string } | null
                      const machineName = machine?.name ?? (machine ? `${machine.brand} ${machine.model}` : null)
                      const st = STATUS[w.status] ?? { label: w.status, badge: 'bg-white/8 border-white/12 text-white/30' }

                      return (
                        <tr key={w.id} className={`transition-colors duration-100 hover:bg-white/3 ${i % 2 === 0 ? '' : 'bg-white/[0.02]'}`}>
                          <td className="px-5 py-3.5">
                            {buyer ? (
                              <Link href={`/admin/buyers/${buyer.id}`} className="group">
                                <p className="font-medium text-white/75 group-hover:text-white transition-colors leading-tight">
                                  {buyer.company_name || buyer.email}
                                </p>
                                {buyer.company_name && (
                                  <p className="text-[11px] text-white/30 mt-0.5">{buyer.email}</p>
                                )}
                              </Link>
                            ) : (
                              <span className="text-white/25 italic text-xs">Unknown</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 hidden md:table-cell">
                            {machineName && machine ? (
                              <Link href={`/machines/${machine.id}`} target="_blank" className="text-white/45 hover:text-gold-300 transition-colors text-xs">
                                {machineName}
                              </Link>
                            ) : (
                              <span className="text-white/20 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-white/40 text-xs font-mono whitespace-nowrap">
                            {full}
                          </td>
                          <td className="px-5 py-3.5 hidden lg:table-cell text-white/35 text-xs">
                            {w.technician || <span className="text-white/20 italic">Unassigned</span>}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wide ${st.badge}`}>
                              {st.label}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-3 border-t border-white/6 flex items-center justify-between">
                <p className="text-[10px] text-white/20">{pastCount ?? 0} record{(pastCount ?? 0) !== 1 ? 's' : ''}</p>
              </div>
              {(pastCount ?? 0) >= 5 && (
                <div className="flex items-center justify-between px-5 py-3.5 border-t border-white/6">
                  <Link
                    href={`/admin/walkthroughs?page=${page - 1}`}
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
                    href={`/admin/walkthroughs?page=${page + 1}`}
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
          </section>
        )}

      </main>

      {/* ── FOOTER ── */}
      <footer className="bg-navy-950 border-t border-white/5 py-6 px-6 mt-auto">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <p className="text-xs text-white/20">BlueRock Equipment — Admin Operations</p>
          <Link href="/admin" className="text-xs text-white/25 hover:text-white/50 transition-colors duration-150">
            ← Dashboard
          </Link>
        </div>
      </footer>

    </div>
  )
}
