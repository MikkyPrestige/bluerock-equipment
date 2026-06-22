import { createClient } from '@/lib/supabase/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import SignOutButton          from './signout-button'
import WatchlistExportButtons from '@/components/dashboard/WatchlistExportButtons'
import logo         from '@/assests/img/logo.jpg'
import excImg       from '@/assests/img/machinery/machine-card-excavator-openpit.jpg'
import bullImg      from '@/assests/img/machinery/machine-card-bulldozer-field.jpg'
import loaderImg    from '@/assests/img/machinery/machine-card-wheel-loader-gravel.jpg'
import graderImg    from '@/assests/img/machinery/machine-card-motor-grader-road.jpg'
import truckImg     from '@/assests/img/machinery/freight-port-crane-containers.jpg'
import compactorImg from '@/assests/img/machinery/yard-operations-aerial-storage.jpg'

/* ── Category thumbnail map ── */
const CATEGORY_IMAGES: Record<string, typeof excImg> = {
  'Excavator':         excImg,
  'Bulldozer':         bullImg,
  'Wheel Loader':      loaderImg,
  'Motor Grader':      graderImg,
  'Articulated Truck': truckImg,
  'Compactor':         compactorImg,
}
function catImg(cat: string | undefined) {
  return CATEGORY_IMAGES[cat ?? ''] ?? excImg
}

/* ── Status maps ── */
const QUOTE_STATUS: Record<string, { label: string; badge: string }> = {
  pending_quote:     { label: 'Awaiting Quote',   badge: 'bg-amber-500/20 border-amber-500/30 text-amber-400' },
  invoice_generated: { label: 'Proforma Ready',   badge: 'bg-blue-500/20 border-blue-500/30 text-blue-400' },
  buyer_accepted:    { label: 'Accepted',          badge: 'bg-indigo-500/20 border-indigo-500/30 text-indigo-400' },
  payment_pending:   { label: 'Payment Pending',   badge: 'bg-orange-500/20 border-orange-500/30 text-orange-400' },
  payment_confirmed: { label: 'Payment Confirmed', badge: 'bg-teal-500/20 border-teal-500/30 text-teal-400' },
  sold:              { label: 'Sold',              badge: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' },
  cancelled:         { label: 'Cancelled',         badge: 'bg-white/8 border-white/12 text-white/30' },
}

const TIER_BADGE: Record<string, string> = {
  gold:     'bg-gold-400/20 border-gold-400/40 text-gold-400',
  silver:   'bg-slate-300/20 border-slate-300/30 text-slate-300',
  observer: 'bg-white/8 border-white/12 text-white/35',
}

const MACHINE_STATUS_COLOR: Record<string, string> = {
  available:       'text-emerald-400',
  pending_hold:    'text-amber-400',
  reserved:        'text-amber-400',
  payment_pending: 'text-orange-400',
  sold:            'text-red-400',
}

function lockColor(h: number) {
  if (h <= 6)  return 'text-red-400'
  if (h <= 12) return 'text-orange-400'
  if (h <= 24) return 'text-amber-400'
  return 'text-emerald-400'
}

/* ── Card shell ── */
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-navy-900 border border-white/8 rounded-2xl ${className}`}>
      {children}
    </div>
  )
}

function CardHeader({ label, count, action }: { label: string; count?: number; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/6">
      <div className="flex items-center gap-2">
        <p className="text-xs font-bold text-white/35 uppercase tracking-widest">{label}</p>
        {count !== undefined && (
          <span className="text-[10px] text-gold-400 bg-gold-400/12 border border-gold-400/20 px-2 py-0.5 rounded-full font-semibold">
            {count}
          </span>
        )}
      </div>
      {action}
    </div>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: buyer }, { data: quotes }, { data: watchlist }] = await Promise.all([
    supabase.from('buyers').select('*').eq('id', user.id).single(),
    supabase
      .from('quotes')
      .select('id, status, total_amount, lock_expires_at, created_at, port_of_discharge, machines(name, brand, model, price_usd)')
      .eq('buyer_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('watchlist')
      .select('machine_id, in_comparison, created_at, machines(id, name, brand, model, price_usd, status, category)')
      .eq('buyer_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  /* Document count across all quotes */
  const quoteIds = (quotes ?? []).map(q => q.id)
  let documentCount = 0
  if (quoteIds.length > 0) {
    const { count } = await adminSupabase
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .in('quote_id', quoteIds)
      .is('superseded_at', null)
    documentCount = count ?? 0
  }

  const comparisonCount = (watchlist ?? []).filter(w => w.in_comparison).length
  const activeQuoteCount = (quotes ?? []).filter(q => !['sold', 'cancelled'].includes(q.status)).length
  const savedCount = watchlist?.length ?? 0
  const displayName = buyer?.company_name || user.email?.split('@')[0] || 'Buyer'
  const tier = buyer?.tier ?? 'observer'
  const tierBadge = TIER_BADGE[tier] ?? TIER_BADGE.observer
  const isAdmin = user.email === process.env.ADMIN_EMAIL

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col">

      {/* ── NAV ── */}
      <header className="sticky top-0 z-50 bg-navy-950/96 backdrop-blur-md border-b border-white/8 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link href="/">
            <Image src={logo} alt="BlueRock Equipment" className="h-9 w-auto object-contain invert opacity-90" />
          </Link>
          <span className="hidden sm:inline text-xs text-gold-400 font-semibold uppercase tracking-widest">
            Buyer Dashboard
          </span>
        </div>
        <div className="flex items-center gap-4">
          <nav className="hidden sm:flex items-center gap-5 text-sm text-white/40">
            <Link href="/machines" className="hover:text-white transition-colors duration-150">Inventory</Link>
            <Link href="/trust"    className="hover:text-white transition-colors duration-150">Trust Hub</Link>
          </nav>
          <div className="h-4 w-px bg-white/10 hidden sm:block" />
          {isAdmin && (
            <Link
              href="/admin"
              className="text-xs font-bold text-gold-400 hover:text-gold-300 border border-gold-400/30 hover:border-gold-400/55 px-3 py-1.5 rounded-lg transition-all duration-150"
            >
              Admin Panel
            </Link>
          )}
          <SignOutButton />
        </div>
      </header>

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col gap-6">

        {/* ── GREETING ROW ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs text-white/30 uppercase tracking-widest mb-1">Welcome back</p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">{displayName}</h1>
            <p className="text-white/30 text-sm mt-1">{user.email}</p>
          </div>
          <span className={`text-xs font-bold px-3.5 py-1.5 rounded-full border uppercase tracking-wider ${tierBadge}`}>
            {tier} Buyer
          </span>
        </div>

        {/* ── KYC BANNER ── */}
        {!buyer?.kyc_verified && (
          <div className="flex items-center justify-between gap-4 bg-amber-500/8 border border-amber-500/20 rounded-2xl px-5 py-4 flex-wrap">
            <div>
              <p className="text-amber-400 font-semibold text-sm">Complete Your KYC Verification</p>
              <p className="text-white/35 text-xs mt-0.5">Required to access quotes and export documentation.</p>
            </div>
            <Link
              href="/auth/onboarding"
              className="bg-amber-500/20 border border-amber-500/30 text-amber-400 hover:bg-amber-500/30 text-xs font-bold px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
            >
              Complete KYC →
            </Link>
          </div>
        )}

        {/* ── STATS BAR ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { value: savedCount,       label: 'Machines Saved',    suffix: '' },
            { value: activeQuoteCount, label: 'Active Quotes',     suffix: '' },
            { value: documentCount,    label: 'Documents Ready',   suffix: '' },
            { value: comparisonCount,  label: 'In Comparison',     suffix: '/3' },
          ].map(({ value, label, suffix }) => (
            <div key={label} className="bg-navy-900 border border-white/8 rounded-xl px-4 py-3.5 text-center">
              <p className="font-display text-2xl font-bold text-gold-400">
                {value}{suffix}
              </p>
              <p className="text-white/30 text-[10px] uppercase tracking-widest mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* ── MAIN GRID ── */}
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-3 lg:items-start lg:gap-6">

          {/* ── LEFT COLUMN (col-span-2) ── */}
          <div className="lg:col-span-2 flex flex-col gap-6">

            {/* My Quotes & Transactions */}
            <Card>
              <CardHeader
                label="My Quotes & Transactions"
                count={activeQuoteCount || undefined}
                action={
                  <Link href="/machines" className="text-xs text-gold-400 hover:text-gold-300 transition-colors">
                    Browse Inventory →
                  </Link>
                }
              />

              {!quotes || quotes.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <p className="text-white/25 text-sm mb-3">No quotes yet.</p>
                  <Link href="/machines" className="text-gold-400 text-sm font-semibold hover:text-gold-300 transition-colors">
                    Browse inventory to request your first quote →
                  </Link>
                </div>
              ) : (
                <div className="p-4 flex flex-col gap-3">
                  {quotes.map(q => {
                    const machine    = q.machines as unknown as { name?: string; brand: string; model: string; price_usd: number } | null
                    const machineName = machine?.name || `${machine?.brand} ${machine?.model}` || 'Unknown Machine'
                    const status     = QUOTE_STATUS[q.status] ?? { label: q.status, badge: 'bg-white/8 border-white/12 text-white/40' }
                    const lockDate   = q.lock_expires_at ? new Date(q.lock_expires_at) : null
                    const now        = Date.now()
                    const hoursLeft  = lockDate ? Math.ceil((lockDate.getTime() - now) / 3600000) : null
                    const lockActive = hoursLeft !== null && hoursLeft > 0
                    const lockExpired= lockDate && lockDate.getTime() < now

                    const displayPrice = q.total_amount
                      ? `$${Number(q.total_amount).toLocaleString()}`
                      : `$${Number(machine?.price_usd ?? 0).toLocaleString()} + freight`

                    return (
                      <div key={q.id} className="bg-navy-950/50 border border-white/6 rounded-xl p-4 hover:border-white/12 transition-colors duration-150">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1.5">
                              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wide ${status.badge}`}>
                                {status.label}
                              </span>
                              {lockActive && (
                                <span className={`text-[10px] font-semibold ${lockColor(hoursLeft!)}`}>
                                  ⏱ {hoursLeft}h lock remaining
                                </span>
                              )}
                              {lockExpired && !lockActive && (
                                <span className="text-[10px] text-red-400/60">Lock expired</span>
                              )}
                            </div>
                            <h3 className="font-display font-bold text-white text-base leading-tight truncate">
                              {machineName}
                            </h3>
                            <p className="text-white/30 text-xs mt-0.5">
                              Port: {q.port_of_discharge || '—'}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-display text-lg font-bold text-gold-400 leading-tight">{displayPrice}</p>
                            <p className="text-white/20 text-[10px] mt-0.5">
                              {new Date(q.created_at).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                            </p>
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <Link
                            href={`/dashboard/quotes/${q.id}`}
                            className="text-xs font-semibold text-gold-400 hover:text-gold-300 border border-gold-400/25 hover:border-gold-400/50 px-3.5 py-1.5 rounded-lg transition-all duration-150"
                          >
                            View Details →
                          </Link>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>

            {/* Watchlist & Alerts */}
            <Card>
              <CardHeader
                label="Watchlist & Alerts"
                count={savedCount || undefined}
                action={
                  <div className="flex items-center gap-3">
                    <WatchlistExportButtons count={savedCount} />
                    <Link href="/dashboard/watchlist" className="text-xs text-gold-400 hover:text-gold-300 transition-colors">
                      View all →
                    </Link>
                  </div>
                }
              />

              {!watchlist || watchlist.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <p className="text-white/25 text-sm mb-3">No saved machines yet.</p>
                  <Link href="/machines" className="text-gold-400 text-sm font-semibold hover:text-gold-300 transition-colors">
                    Browse inventory →
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-white/5 px-5">
                  {watchlist.slice(0, 6).map(w => {
                    const m = w.machines as unknown as { id: string; name?: string; brand: string; model: string; price_usd: number; status: string; category?: string } | null
                    if (!m) return null
                    const machineName = m.name || `${m.brand} ${m.model}`
                    const statusColor = MACHINE_STATUS_COLOR[m.status] ?? 'text-white/35'
                    const statusText  = m.status.replace(/_/g, ' ')

                    return (
                      <div key={w.machine_id} className="flex items-center gap-3.5 py-3.5">
                        {/* Category thumbnail */}
                        <div className="w-14 h-10 rounded-lg overflow-hidden flex-shrink-0 relative bg-navy-800">
                          <Image
                            src={catImg(m.category)}
                            alt={m.category ?? ''}
                            fill
                            className="object-cover"
                            sizes="56px"
                          />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/machines/${m.id}`}
                            className="text-sm font-semibold text-white hover:text-gold-300 transition-colors duration-150 truncate block"
                          >
                            {machineName}
                          </Link>
                          <p className={`text-[10px] uppercase font-semibold tracking-wide mt-0.5 ${statusColor}`}>
                            {statusText}
                          </p>
                        </div>

                        {/* Price */}
                        <p className="text-gold-400 text-sm font-bold flex-shrink-0">
                          ${Number(m.price_usd).toLocaleString()}
                        </p>
                      </div>
                    )
                  })}

                  {watchlist.length > 6 && (
                    <div className="py-3 text-center">
                      <Link href="/machines" className="text-xs text-white/30 hover:text-gold-400 transition-colors">
                        +{watchlist.length - 6} more saved machines
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>

          {/* ── RIGHT SIDEBAR (col-span-1) ── */}
          <div className="lg:col-span-1 flex flex-col gap-4 lg:sticky lg:top-[73px]">

            {/* Account card */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-bold text-white/35 uppercase tracking-widest">Your Account</p>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wide ${tierBadge}`}>
                  {tier}
                </span>
              </div>

              <div className="mb-4">
                <p className="text-white font-semibold text-sm">{buyer?.company_name || 'Company not set'}</p>
                <p className="text-white/30 text-xs mt-0.5">{user.email}</p>
                {buyer?.preferred_port_of_discharge && (
                  <p className="text-white/25 text-xs mt-1.5">
                    📍 Preferred port: {buyer.preferred_port_of_discharge}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/8">
                <Link href="/auth/onboarding" className="text-xs text-white/30 hover:text-white/60 transition-colors">
                  Edit KYC Details
                </Link>
                <SignOutButton />
              </div>
            </Card>

            {/* Comparison Workbench */}
            <Card className="p-5">
              <p className="text-xs font-bold text-white/35 uppercase tracking-widest mb-4">Comparison Workbench</p>

              {comparisonCount > 0 ? (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full bg-gold-400 animate-pulse" />
                    <p className="text-white text-sm font-semibold">
                      {comparisonCount} machine{comparisonCount !== 1 ? 's' : ''} in tray
                    </p>
                  </div>
                  <Link
                    href="/comparison"
                    className="block w-full text-center bg-gold-400 hover:bg-gold-300 text-navy-950 font-bold px-4 py-3 rounded-xl text-sm transition-colors duration-150 shadow-lg shadow-black/20"
                  >
                    Open Workbench
                  </Link>
                </div>
              ) : (
                <div>
                  <p className="text-white/25 text-sm mb-2">No machines selected.</p>
                  <p className="text-white/20 text-xs leading-relaxed">
                    Click <span className="text-white/35">+ Compare</span> on any machine card to add it to your tray.
                  </p>
                  <Link
                    href="/machines"
                    className="mt-4 block text-center border border-white/10 hover:border-white/25 text-white/40 hover:text-white/70 text-xs font-semibold px-4 py-2.5 rounded-xl transition-all duration-150"
                  >
                    Browse Inventory
                  </Link>
                </div>
              )}
            </Card>

            {/* Live Walkthrough Schedule */}
            <Card className="p-5">
              <p className="text-xs font-bold text-white/35 uppercase tracking-widest mb-3">
                Live Walkthrough Schedule
              </p>

              {buyer?.walkthrough_notes ? (
                <div className="bg-navy-950/50 border border-white/6 rounded-xl p-4">
                  <p className="text-white/55 text-xs leading-relaxed whitespace-pre-line">
                    {String(buyer.walkthrough_notes)}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-white/25 text-sm mb-3">No upcoming walkthroughs.</p>
                  <p className="text-white/20 text-xs leading-relaxed mb-4">
                    Book a 30-minute live video call with our yard team on any machine listing page.
                  </p>
                  <Link
                    href="/machines"
                    className="block text-center border border-white/10 hover:border-gold-400/30 text-white/40 hover:text-gold-400 text-xs font-semibold px-4 py-2.5 rounded-xl transition-all duration-150"
                  >
                    Find a Machine to Walk Through
                  </Link>
                </div>
              )}
            </Card>

            {/* Document Vault quick access */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-bold text-white/35 uppercase tracking-widest">Document Vault</p>
                {documentCount > 0 && (
                  <span className="text-[10px] text-gold-400 bg-gold-400/12 border border-gold-400/20 px-2 py-0.5 rounded-full font-semibold">
                    {documentCount} ready
                  </span>
                )}
              </div>

              {documentCount > 0 ? (
                <div>
                  <p className="text-white/40 text-xs leading-relaxed mb-4">
                    {documentCount} document{documentCount !== 1 ? 's' : ''} available across your transactions.
                  </p>
                  {(quotes ?? []).filter(q => !['sold', 'cancelled'].includes(q.status)).map(q => {
                    const machine = q.machines as unknown as { brand: string; model: string } | null
                    return (
                      <Link
                        key={q.id}
                        href={`/dashboard/quotes/${q.id}`}
                        className="flex items-center justify-between py-2.5 border-b border-white/6 last:border-0 group"
                      >
                        <p className="text-white/55 text-xs group-hover:text-white/80 transition-colors truncate">
                          {machine ? `${machine.brand} ${machine.model}` : `Quote ${q.id.slice(0, 8)}`}
                        </p>
                        <span className="text-gold-400 text-[10px] font-semibold flex-shrink-0 ml-2">View →</span>
                      </Link>
                    )
                  })}
                </div>
              ) : (
                <p className="text-white/20 text-sm">Documents will appear here once your Proforma Invoice is issued.</p>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer className="bg-navy-950 border-t border-white/5 py-8 px-6 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <Link href="/">
              <Image src={logo} alt="BlueRock Equipment" className="h-8 w-auto object-contain invert opacity-75" />
            </Link>
            <p className="text-xs mt-1.5 text-white/20">Premium Direct-Sale Heavy Machinery</p>
          </div>
          <nav className="flex gap-5 text-xs text-white/30">
            <Link href="/machines"   className="hover:text-white transition-colors duration-150">Inventory</Link>
            <Link href="/trust"      className="hover:text-white transition-colors duration-150">Trust Hub</Link>
            <Link href="/comparison" className="hover:text-white transition-colors duration-150">Comparison</Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
