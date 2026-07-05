import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import GenerateReportButton from '@/components/admin/GenerateReportButton'
import AdminMobileNav from '@/components/AdminMobileNav'
import logo from '@/assests/img/logo.jpg'

/* ── Status badge (dark-adapted) ── */
function statusBadge(status: string): string {
  switch (status) {
    case 'available':       return 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
    case 'pending_hold':    return 'bg-amber-500/20 border-amber-500/30 text-amber-400'
    case 'reserved':        return 'bg-amber-500/20 border-amber-500/30 text-amber-400'
    case 'payment_pending': return 'bg-orange-500/20 border-orange-500/30 text-orange-400'
    case 'sold':            return 'bg-red-500/20 border-red-500/30 text-red-400'
    default:                return 'bg-white/8 border-white/12 text-white/40'
  }
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

const PAGE_SIZE = 20

export default async function AdminInventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1', 10))
  const offset = (page - 1) * PAGE_SIZE

  const supabase = await createClient()

  const [
    { count: totalCount },
    { count: availableCount },
    { count: activeCount },
    { count: soldCount },
    { data: machines },
  ] = await Promise.all([
    supabase.from('machines').select('*', { count: 'exact', head: true }),
    supabase.from('machines').select('*', { count: 'exact', head: true }).eq('status', 'available'),
    supabase.from('machines').select('*', { count: 'exact', head: true }).neq('status', 'sold'),
    supabase.from('machines').select('*', { count: 'exact', head: true }).eq('status', 'sold'),
    supabase.from('machines').select('*').order('created_at', { ascending: false }).range(offset, offset + PAGE_SIZE - 1),
  ])

  const total      = totalCount     ?? 0
  const available  = availableCount ?? 0
  const active     = activeCount    ?? 0
  const sold       = soldCount      ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col">

      {/* ── STICKY NAV ── */}
      <header className="sticky top-0 z-50 bg-navy-950/96 backdrop-blur-md border-b border-white/8">
        {/* Top row: logo + title + add button */}
        <div className="px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Image src={logo} alt="BlueRock Equipment" className="h-9 w-auto object-contain invert opacity-90" />
            </Link>
            <div className="hidden sm:block h-5 w-px bg-white/10" />
            <div className="hidden sm:block">
              <h1 className="font-display text-base font-bold text-white leading-tight">BlueRock Admin</h1>
              <p className="text-[10px] text-gold-400 font-semibold uppercase tracking-widest">Inventory</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <Link
              href="/admin/inventory/new"
              className="bg-gold-400 hover:bg-gold-300 text-navy-950 text-sm font-bold px-4 py-2.5 rounded-lg transition-colors duration-150 shadow-md shadow-black/20"
            >
              + Add Machine
            </Link>
            <AdminMobileNav />
          </div>
        </div>

        {/* Tab bar */}
        <div className="hidden sm:block px-6 overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-0 min-w-max border-t border-white/6">
            {TABS.map(tab => {
              const isActive = tab.href === '/admin/inventory'
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
            { label: 'Total Listed',  value: total    },
            { label: 'Available',     value: available },
            { label: 'Active',        value: active    },
            { label: 'Sold',          value: sold      },
          ].map(({ label, value }) => (
            <div key={label} className="bg-navy-900 border border-white/8 rounded-xl px-4 py-3 text-center">
              <p className="font-display text-2xl font-bold text-gold-400">{value}</p>
              <p className="text-[10px] text-white/30 uppercase tracking-widest mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* ── EMPTY STATE ── */}
        {total === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-32">
            <div className="text-white/10 text-7xl mb-6">⚙</div>
            <p className="text-white/35 text-base mb-2">No machines in inventory yet.</p>
            <p className="text-white/20 text-sm mb-8">Add your first machine to start receiving quote requests.</p>
            <Link
              href="/admin/inventory/new"
              className="bg-gold-400 hover:bg-gold-300 text-navy-950 font-bold px-7 py-3 rounded-xl text-sm transition-colors duration-150 shadow-lg shadow-black/20"
            >
              + Add Your First Machine
            </Link>
          </div>
        ) : (
          /* ── TABLE ── */
          <div className="bg-navy-900 border border-white/8 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto scrollbar-hide">
              <table className="w-full text-sm min-w-[780px]">

                {/* Header */}
                <thead>
                  <tr className="border-b border-white/8 bg-navy-800">
                    <th className="px-5 py-4 text-left text-[10px] font-bold text-white/35 uppercase tracking-widest">Machine</th>
                    <th className="px-5 py-4 text-left text-[10px] font-bold text-white/35 uppercase tracking-widest">Year</th>
                    <th className="px-5 py-4 text-left text-[10px] font-bold text-white/35 uppercase tracking-widest">Hours</th>
                    <th className="px-5 py-4 text-left text-[10px] font-bold text-white/35 uppercase tracking-widest">Price USD</th>
                    <th className="px-5 py-4 text-left text-[10px] font-bold text-white/35 uppercase tracking-widest">Status</th>
                    <th className="px-5 py-4 text-left text-[10px] font-bold text-white/35 uppercase tracking-widest hidden lg:table-cell">Yard</th>
                    <th className="px-5 py-4 text-left text-[10px] font-bold text-white/35 uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>

                {/* Rows */}
                <tbody>
                  {(machines ?? []).map((machine, i) => (
                    <tr
                      key={machine.id}
                      className={`border-b border-white/5 last:border-0 hover:bg-white/4 transition-colors duration-100 ${
                        i % 2 === 1 ? 'bg-white/[0.02]' : ''
                      }`}
                    >
                      {/* Machine — name + category sub-label */}
                      <td className="px-5 py-4">
                        <Link href={`/machines/${machine.id}`} target="_blank" className="group">
                          <p className="font-display font-bold text-white text-sm leading-tight group-hover:text-gold-300 transition-colors duration-150">
                            {machine.brand} {machine.model}
                          </p>
                          <p className="text-[10px] text-white/30 uppercase tracking-wider mt-0.5">
                            {machine.category}
                          </p>
                        </Link>
                      </td>

                      {/* Year */}
                      <td className="px-5 py-4 text-white/60 tabular-nums">{machine.year}</td>

                      {/* Hours */}
                      <td className="px-5 py-4 text-white/60 tabular-nums whitespace-nowrap">
                        {machine.engine_hours.toLocaleString()} hrs
                      </td>

                      {/* Price */}
                      <td className="px-5 py-4 text-gold-400 font-semibold tabular-nums whitespace-nowrap">
                        ${Number(machine.price_usd).toLocaleString()}
                      </td>

                      {/* Status badge */}
                      <td className="px-5 py-4">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wide whitespace-nowrap ${statusBadge(machine.status)}`}>
                          {machine.status.replace(/_/g, ' ')}
                        </span>
                      </td>

                      {/* Yard — hidden below lg */}
                      <td className="px-5 py-4 text-white/50 text-xs whitespace-nowrap hidden lg:table-cell">
                        {machine.yard_city}, {machine.yard_country}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-4">
                          <Link
                            href={`/admin/inventory/${machine.id}/edit`}
                            className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors duration-150"
                          >
                            Edit
                          </Link>
                          <GenerateReportButton
                            machineId={machine.id}
                            hasReport={!!machine.inspection_report_url}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Table footer */}
            <div className="px-5 py-3 border-t border-white/6 flex items-center justify-between">
              <p className="text-[11px] text-white/25">
                {total} machine{total !== 1 ? 's' : ''} listed
              </p>
              <Link
                href="/admin/inventory/new"
                className="text-[11px] font-semibold text-gold-400 hover:text-gold-300 transition-colors duration-150"
              >
                + Add Machine
              </Link>
            </div>
            {total >= 5 && (
              <div className="flex items-center justify-between px-5 py-3.5 border-t border-white/6">
                <Link
                  href={`/admin/inventory?page=${page - 1}`}
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
                  href={`/admin/inventory?page=${page + 1}`}
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
