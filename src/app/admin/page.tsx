import { adminSupabase } from '@/lib/supabase/admin'
import Link from 'next/link'
import Image from 'next/image'
import logo from '@/assests/img/logo.jpg'

/* ── Admin section cards ── */
const NAV = [
  {
    href: '/admin/inventory',
    label: 'Inventory',
    tag: 'Fleet',
    desc: 'Add machines, generate inspection reports, manage listings',
    primary: { label: 'Open Inventory', href: '/admin/inventory' },
    secondary: { label: '+ Add Machine', href: '/admin/inventory/new' },
  },
  {
    href: '/admin/quotes',
    label: 'Quotes',
    tag: 'Transactions',
    desc: 'Review quote requests, set pricing, generate proforma invoices',
    primary: { label: 'Open Quotes', href: '/admin/quotes' },
    secondary: null,
  },
  {
    href: '/admin/buyers',
    label: 'Buyers',
    tag: 'Community',
    desc: 'Manage buyer tiers, KYC verification, and arrival alerts',
    primary: { label: 'Open Buyers', href: '/admin/buyers' },
    secondary: null,
  },
  {
    href: '/admin/walkthroughs',
    label: 'Walkthroughs',
    tag: 'Schedule',
    desc: 'Log Calendly bookings, assign technicians, add post-call notes',
    primary: { label: 'Open Walkthroughs', href: '/admin/walkthroughs' },
    secondary: null,
  },
  {
    href: '/admin/freight-rates',
    label: 'Freight Rates',
    tag: 'Logistics',
    desc: 'Edit destination port base costs — refresh monthly with shipping partners',
    primary: { label: 'Open Rates', href: '/admin/freight-rates' },
    secondary: null,
  },
]

/* ── Status badges (dark-adapted) ── */
const STATUS: Record<string, { label: string; badge: string }> = {
  pending_quote:     { label: 'Awaiting Quote',   badge: 'bg-amber-500/20 border-amber-500/30 text-amber-400' },
  invoice_generated: { label: 'Proforma Ready',   badge: 'bg-blue-500/20 border-blue-500/30 text-blue-400' },
  buyer_accepted:    { label: 'Accepted',          badge: 'bg-indigo-500/20 border-indigo-500/30 text-indigo-400' },
  payment_pending:   { label: 'Payment Pending',   badge: 'bg-orange-500/20 border-orange-500/30 text-orange-400' },
  payment_confirmed: { label: 'Payment Confirmed', badge: 'bg-teal-500/20 border-teal-500/30 text-teal-400' },
  sold:              { label: 'Sold',              badge: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' },
  cancelled:         { label: 'Cancelled',         badge: 'bg-white/8 border-white/12 text-white/30' },
}

export default async function AdminDashboardPage() {
  const [
    { count: machineCount },
    { count: quoteCount },
    { count: buyerCount },
    { data: recentQuotes },
  ] = await Promise.all([
    adminSupabase.from('machines').select('*', { count: 'exact', head: true }).neq('status', 'sold'),
    adminSupabase.from('quotes').select('*', { count: 'exact', head: true }).eq('status', 'pending_quote'),
    adminSupabase.from('buyers').select('*', { count: 'exact', head: true }),
    adminSupabase
      .from('quotes')
      .select('id, status, created_at, machines(name, brand, model), buyers(company_name, email)')
      .order('created_at', { ascending: false })
      .limit(8),
  ])

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col">

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-50 bg-navy-950/96 backdrop-blur-md border-b border-white/8 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Image src={logo} alt="BlueRock Equipment" className="h-9 w-auto object-contain invert opacity-90" />
          </Link>
          <div className="hidden sm:block h-5 w-px bg-white/10" />
          <div className="hidden sm:block">
            <h1 className="font-display text-lg font-bold text-white leading-tight">BlueRock Admin</h1>
            <p className="text-[10px] text-gold-400 font-semibold uppercase tracking-widest">Operations Dashboard</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/machines"
            className="text-xs font-semibold text-gold-400 hover:text-gold-300 border border-gold-400/30 hover:border-gold-400/55 px-3 py-1.5 rounded-lg transition-all duration-150 hidden sm:inline-flex items-center gap-1.5"
          >
            View Public Site →
          </Link>
          <Link
            href="/dashboard"
            className="text-xs text-white/35 hover:text-white/70 transition-colors duration-150"
          >
            Buyer Dashboard
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 space-y-8">

        {/* ── STATS ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-navy-900 border border-white/8 rounded-2xl px-6 py-5">
            <p className="text-[10px] font-bold text-white/35 uppercase tracking-widest mb-3">Active Machines</p>
            <p className="font-display text-4xl font-bold text-gold-400">{machineCount ?? 0}</p>
            <p className="text-white/25 text-xs mt-2">in yard, excluding sold</p>
          </div>

          <div className="bg-navy-900 border border-amber-500/20 rounded-2xl px-6 py-5 relative overflow-hidden">
            {/* Attention accent for pending quotes */}
            {(quoteCount ?? 0) > 0 && (
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500/60 via-amber-400/80 to-amber-500/60" />
            )}
            <p className="text-[10px] font-bold text-white/35 uppercase tracking-widest mb-3">Pending Quotes</p>
            <p className={`font-display text-4xl font-bold ${(quoteCount ?? 0) > 0 ? 'text-amber-400' : 'text-gold-400'}`}>
              {quoteCount ?? 0}
            </p>
            <p className="text-white/25 text-xs mt-2">awaiting your response</p>
          </div>

          <div className="bg-navy-900 border border-white/8 rounded-2xl px-6 py-5">
            <p className="text-[10px] font-bold text-white/35 uppercase tracking-widest mb-3">Registered Buyers</p>
            <p className="font-display text-4xl font-bold text-gold-400">{buyerCount ?? 0}</p>
            <p className="text-white/25 text-xs mt-2">of max capacity</p>
          </div>
        </div>

        {/* ── ADMIN SECTIONS ── */}
        <div>
          <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-4">Admin Sections</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {NAV.map(({ href, label, tag, desc, primary, secondary }) => (
              <div key={href} className="bg-navy-900 border border-white/8 rounded-2xl p-5 flex flex-col hover:border-white/15 transition-colors duration-150 group">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold text-gold-400/60 uppercase tracking-widest">{tag}</span>
                </div>
                <Link href={href} className="font-display font-bold text-white text-lg leading-tight mb-2 group-hover:text-gold-300 transition-colors duration-150">
                  {label}
                </Link>
                <p className="text-xs text-white/35 leading-relaxed flex-1 mb-4">{desc}</p>
                <div className="flex items-center gap-4 pt-4 border-t border-white/6">
                  <Link
                    href={primary.href}
                    className="text-xs font-semibold text-gold-400 hover:text-gold-300 transition-colors duration-150"
                  >
                    {primary.label} →
                  </Link>
                  {secondary && (
                    <Link
                      href={secondary.href}
                      className="text-xs text-white/30 hover:text-white/60 border border-white/10 hover:border-white/25 px-2.5 py-1 rounded-lg transition-all duration-150"
                    >
                      {secondary.label}
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── RECENT QUOTES ── */}
        {recentQuotes && recentQuotes.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Recent Quotes</p>
              <Link href="/admin/quotes" className="text-xs font-semibold text-gold-400 hover:text-gold-300 transition-colors duration-150">
                View all →
              </Link>
            </div>

            <div className="bg-navy-900 border border-white/8 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto scrollbar-hide">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/8 bg-navy-800">
                      <th className="px-5 py-3.5 text-left text-[10px] font-bold text-white/35 uppercase tracking-widest">Quote</th>
                      <th className="px-5 py-3.5 text-left text-[10px] font-bold text-white/35 uppercase tracking-widest">Buyer</th>
                      <th className="px-5 py-3.5 text-left text-[10px] font-bold text-white/35 uppercase tracking-widest hidden md:table-cell">Machine</th>
                      <th className="px-5 py-3.5 text-left text-[10px] font-bold text-white/35 uppercase tracking-widest">Status</th>
                      <th className="px-5 py-3.5 text-left text-[10px] font-bold text-white/35 uppercase tracking-widest hidden sm:table-cell">Date</th>
                      <th className="px-5 py-3.5 text-left text-[10px] font-bold text-white/35 uppercase tracking-widest"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentQuotes.map((q, i) => {
                      const m = q.machines as unknown as { name?: string; brand: string; model: string } | null
                      const b = q.buyers  as unknown as { company_name: string | null; email: string } | null
                      const s = STATUS[q.status] ?? { label: q.status.replace(/_/g, ' '), badge: 'bg-white/8 border-white/12 text-white/40' }

                      return (
                        <tr
                          key={q.id}
                          className={`border-b border-white/5 last:border-0 hover:bg-white/2 transition-colors duration-100 ${i % 2 === 1 ? 'bg-white/[0.015]' : ''}`}
                        >
                          <td className="px-5 py-3.5 font-mono text-xs text-white/35 whitespace-nowrap">
                            {q.id.slice(0, 8).toUpperCase()}
                          </td>
                          <td className="px-5 py-3.5 text-white/65 text-sm max-w-[140px] truncate">
                            {b?.company_name || b?.email || '—'}
                          </td>
                          <td className="px-5 py-3.5 text-white/65 text-sm hidden md:table-cell max-w-[180px] truncate">
                            {m?.name || (m ? `${m.brand} ${m.model}` : '—')}
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wide ${s.badge}`}>
                              {s.label}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-white/30 text-xs hidden sm:table-cell whitespace-nowrap">
                            {new Date(q.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </td>
                          <td className="px-5 py-3.5">
                            <Link
                              href={`/admin/quotes/${q.id}`}
                              className="text-xs font-semibold text-gold-400 hover:text-gold-300 transition-colors duration-150 whitespace-nowrap"
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
            </div>
          </div>
        )}

      </main>

      {/* ── FOOTER ── */}
      <footer className="bg-navy-950 border-t border-white/5 py-6 px-6 mt-auto">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <p className="text-xs text-white/20">BlueRock Equipment — Admin Operations</p>
          <nav className="flex gap-5 text-xs text-white/25">
            <Link href="/admin/inventory"    className="hover:text-white/60 transition-colors">Inventory</Link>
            <Link href="/admin/quotes"       className="hover:text-white/60 transition-colors">Quotes</Link>
            <Link href="/admin/buyers"       className="hover:text-white/60 transition-colors">Buyers</Link>
            <Link href="/admin/walkthroughs" className="hover:text-white/60 transition-colors">Walkthroughs</Link>
            <Link href="/admin/freight-rates"className="hover:text-white/60 transition-colors">Freight</Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
