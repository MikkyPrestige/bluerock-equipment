import { adminSupabase } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import AdminMobileNav from '@/components/AdminMobileNav'
import logo from '@/assests/img/logo.jpg'

function tierBadge(tier: string): string {
  switch (tier) {
    case 'gold':   return 'bg-gold-400/20 border-gold-400/35 text-gold-400'
    case 'silver': return 'bg-blue-500/20 border-blue-500/30 text-blue-400'
    default:       return 'bg-white/8 border-white/12 text-white/35'
  }
}

/* ── Admin tab nav ── */
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

const PAGE_SIZE = 15

export default async function AdminBuyersPage({
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

  const [
    { count: totalCount },
    { count: verifiedCount },
    { count: goldCount },
    { data: buyers },
    { data: quoteCounts },
  ] = await Promise.all([
    adminSupabase.from('buyers').select('*', { count: 'exact', head: true }),
    adminSupabase.from('buyers').select('*', { count: 'exact', head: true }).eq('kyc_verified', true),
    adminSupabase.from('buyers').select('*', { count: 'exact', head: true }).eq('tier', 'gold'),
    adminSupabase.from('buyers').select('*').order('created_at', { ascending: false }).range(offset, offset + PAGE_SIZE - 1),
    adminSupabase.from('quotes').select('buyer_id'),
  ])

  /* Quote count per buyer */
  const countMap: Record<string, number> = {}
  for (const q of quoteCounts ?? []) {
    countMap[q.buyer_id] = (countMap[q.buyer_id] ?? 0) + 1
  }

  const total      = totalCount    ?? 0
  const verified   = verifiedCount ?? 0
  const goldTier   = goldCount     ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

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
              <p className="text-[10px] text-gold-400 font-semibold uppercase tracking-widest">Buyers</p>
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
              const isActive = tab.href === '/admin/buyers'
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

        {/* ── STATS BAR ── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Buyers', value: total    },
            { label: 'KYC Verified', value: verified  },
            { label: 'Gold Tier',    value: goldTier  },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="bg-navy-900 border border-white/8 rounded-xl px-4 py-3 text-center"
            >
              <p className="font-display text-2xl font-bold text-gold-400">{value}</p>
              <p className="text-[10px] text-white/30 uppercase tracking-widest mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* ── ALL BUYERS TABLE ── */}
        <div>
          <p className="text-[10px] font-bold text-gold-400 uppercase tracking-widest mb-4">
            All Buyers ({total})
          </p>

          <div className="bg-navy-900 border border-white/8 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto scrollbar-hide">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="border-b border-white/8 bg-navy-800">
                    <th className="px-5 py-4 text-left text-[10px] font-bold text-white/35 uppercase tracking-widest">Company</th>
                    <th className="px-5 py-4 text-left text-[10px] font-bold text-white/35 uppercase tracking-widest">Email</th>
                    <th className="px-5 py-4 text-left text-[10px] font-bold text-white/35 uppercase tracking-widest">Tier</th>
                    <th className="px-5 py-4 text-left text-[10px] font-bold text-white/35 uppercase tracking-widest">KYC</th>
                    <th className="px-5 py-4 text-left text-[10px] font-bold text-white/35 uppercase tracking-widest">Quotes</th>
                    <th className="px-5 py-4 text-left text-[10px] font-bold text-white/35 uppercase tracking-widest hidden lg:table-cell">Port</th>
                    <th className="px-5 py-4 text-left text-[10px] font-bold text-white/35 uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(buyers ?? []).map((b, i) => (
                    <tr
                      key={b.id}
                      className={`border-b border-white/5 last:border-0 hover:bg-white/4 transition-colors duration-100 ${
                        i % 2 === 1 ? 'bg-white/[0.02]' : ''
                      }`}
                    >
                      {/* Company */}
                      <td className="px-5 py-4 font-semibold text-white/85 text-sm">
                        {b.company_name || <span className="text-white/25 font-normal italic">Not set</span>}
                      </td>

                      {/* Email */}
                      <td className="px-5 py-4 text-white/55 text-xs max-w-[180px] truncate">
                        {b.email}
                      </td>

                      {/* Tier */}
                      <td className="px-5 py-4">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wide ${tierBadge(b.tier)}`}>
                          {b.tier || 'observer'}
                        </span>
                      </td>

                      {/* KYC */}
                      <td className="px-5 py-4">
                        {b.kyc_verified ? (
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wide bg-emerald-500/15 border-emerald-500/25 text-emerald-400">
                            Verified
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wide bg-amber-500/15 border-amber-500/25 text-amber-400">
                            Pending
                          </span>
                        )}
                      </td>

                      {/* Quotes */}
                      <td className="px-5 py-4 text-white/70 tabular-nums">
                        {countMap[b.id] ?? 0}
                      </td>

                      {/* Port — hidden below lg */}
                      <td className="px-5 py-4 text-white/40 text-xs hidden lg:table-cell max-w-[140px] truncate">
                        {b.preferred_port_of_discharge || <span className="text-white/20">—</span>}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4">
                        <Link
                          href={`/admin/buyers/${b.id}`}
                          className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors duration-150"
                        >
                          Manage →
                        </Link>
                      </td>
                    </tr>
                  ))}

                  {total === 0 && (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-white/25 text-sm">
                        No buyers registered yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer count */}
            <div className="px-5 py-3 border-t border-white/6 flex items-center justify-between">
              <p className="text-[11px] text-white/25">
                {total} buyer{total !== 1 ? 's' : ''} registered
              </p>
              <p className="text-[11px] text-white/20">Max capacity</p>
            </div>
            {total >= 5 && (
              <div className="flex items-center justify-between px-5 py-3.5 border-t border-white/6">
                <Link
                  href={`/admin/buyers?page=${page - 1}`}
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
                  href={`/admin/buyers?page=${page + 1}`}
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
        </div>

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
