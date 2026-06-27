import { createClient } from '@/lib/supabase/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import QuoteRequestButton  from '@/components/machine/QuoteRequestButton'
import WatchlistButton     from '@/components/machine/WatchlistButton'
import CompareToggle       from '@/components/machine/CompareToggle'
import ConfidenceBadges    from '@/components/trust/ConfidenceBadges'
import CalendlyButton      from '@/components/trust/CalendlyButton'
import ComparisonTray      from '@/components/comparison/ComparisonTray'
import logo                from '@/assests/img/logo.jpg'
import excImg              from '@/assests/img/machinery/machine-card-excavator-openpit.jpg'
import bullImg             from '@/assests/img/machinery/machine-card-bulldozer-field.jpg'
import loaderImg           from '@/assests/img/machinery/machine-card-wheel-loader-gravel.jpg'
import graderImg           from '@/assests/img/machinery/machine-card-motor-grader-road.jpg'
import truckImg            from '@/assests/img/machinery/freight-port-crane-containers.jpg'
import compactorImg        from '@/assests/img/machinery/yard-operations-aerial-storage.jpg'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

/* ── Category → hero fallback image ── */
const CATEGORY_IMAGES: Record<string, typeof excImg> = {
  'Excavator':         excImg,
  'Bulldozer':         bullImg,
  'Wheel Loader':      loaderImg,
  'Motor Grader':      graderImg,
  'Articulated Truck': truckImg,
  'Compactor':         compactorImg,
  /* plural keys for consistency with MachineCard */
  'Excavators':        excImg,
  'Bulldozers':        bullImg,
  'Wheel Loaders':     loaderImg,
  'Motor Graders':     graderImg,
  'Articulated Trucks':truckImg,
}

/** Returns the hero src: first non-video item in media_urls, else category fallback. */
function heroSrc(mediaUrls: string[] | null | undefined, category: string): string | typeof excImg {
  const first = (mediaUrls ?? []).find(
    u => u && !u.includes('youtube') && !u.includes('youtu.be')
  )
  if (!first) return CATEGORY_IMAGES[category] ?? excImg
  if (first.startsWith('http')) return first
  return `${SUPABASE_URL}/storage/v1/object/public/machine-media/${first}`
}

/* ── Color maps (dark-adapted) ── */
const STATUS_BADGE: Record<string, string> = {
  available:       'bg-emerald-500/20 border-emerald-500/30 text-emerald-400',
  pending_hold:    'bg-amber-500/20 border-amber-500/30 text-amber-400',
  reserved:        'bg-amber-500/20 border-amber-500/30 text-amber-400',
  payment_pending: 'bg-orange-500/20 border-orange-500/30 text-orange-400',
  sold:            'bg-red-500/20 border-red-500/30 text-red-400',
}

const WEAR: Record<string, { badge: string; label: string }> = {
  excellent:    { badge: 'bg-emerald-500/15 border-emerald-500/25 text-emerald-400', label: 'Excellent' },
  good:         { badge: 'bg-blue-500/15 border-blue-500/25 text-blue-400',          label: 'Good' },
  wear_detected:{ badge: 'bg-amber-500/15 border-amber-500/25 text-amber-400',       label: 'Wear Detected' },
  needs_repair: { badge: 'bg-red-500/15 border-red-500/25 text-red-400',             label: 'Needs Repair' },
}

interface Machine {
  id: string; brand: string; model: string; year: number; category: string
  use_case: string; engine_hours: number; price_usd: number
  yard_city: string; yard_country: string; status: string
  wear_analysis: Record<string, string>; media_urls: string[]
  specs?: Record<string, string>
  description?: string; serial_number?: string; operating_weight_kg?: number
  engine_configuration?: string; hours_since_service?: number
  video_url?: string; inspection_report_url?: string
}

export default async function MachineDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { id } = await params

  const [{ data: machine, error }, { data: { user } }] = await Promise.all([
    supabase.from('machines').select('*').eq('id', id).single(),
    supabase.auth.getUser(),
  ])

  if (error || !machine) notFound()

  let buyerPort = ''
  let isWatchlisted = false
  let isInComparison = false
  let freightEstimate: { port_name: string; country: string; base_cost_usd: number } | null = null

  if (user) {
    const [{ data: buyer }, { data: wlEntry }] = await Promise.all([
      supabase.from('buyers').select('preferred_port_of_discharge').eq('id', user.id).single(),
      supabase.from('watchlist').select('in_comparison').eq('buyer_id', user.id).eq('machine_id', id).maybeSingle(),
    ])
    buyerPort = buyer?.preferred_port_of_discharge ?? ''
    isWatchlisted = !!wlEntry
    isInComparison = wlEntry?.in_comparison ?? false

    if (buyerPort) {
      const portKey = buyerPort.split(',')[0].trim()
      const { data: fr } = await adminSupabase
        .from('freight_rates')
        .select('port_name, country, base_cost_usd')
        .ilike('port_name', `%${portKey}%`)
        .maybeSingle()
      freightEstimate = fr ?? null
    }
  }

  const m = machine as Machine
  const wearAnalysis = m.wear_analysis || {}
  const mediaUrls = (m.media_urls || []).filter((u: string) => !u.includes('youtube') && !u.includes('youtu.be'))
  const statusBadge = STATUS_BADGE[m.status] ?? 'bg-white/10 border-white/15 text-white/60'
  const statusLabel = m.status.replace(/_/g, ' ')
  const heroImg = heroSrc(m.media_urls, m.category)

  const quickSpecs = [
    { label: 'Year',          value: String(m.year) },
    { label: 'Engine Hours',  value: `${m.engine_hours.toLocaleString()} hrs` },
    { label: 'Yard Location', value: `${m.yard_city}, ${m.yard_country}` },
    { label: 'Use Case',      value: m.use_case },
  ]

  const categorySpecs = m.specs && typeof m.specs === 'object'
    ? Object.entries(m.specs).filter(([, v]) => v && String(v).trim() !== '')
    : []

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col">

      {/* ── NAV ── */}
      <header className="sticky top-0 z-50 bg-navy-950/96 backdrop-blur-md border-b border-white/8 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link href="/">
            <Image src={logo} alt="BlueRock Equipment" className="h-9 w-auto object-contain invert opacity-90" />
          </Link>
          <div className="hidden sm:flex items-center gap-2 text-sm text-white/30">
            <Link href="/machines" className="hover:text-white transition-colors duration-150">← Inventory</Link>
            <span>/</span>
            <span className="text-white/50 truncate max-w-[200px]">{m.brand} {m.model}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/machines" className="text-sm text-white/35 hover:text-white sm:hidden transition-colors">← Back</Link>
          {user
            ? <Link href="/dashboard" className="text-sm text-white/35 hover:text-white transition-colors duration-150">Dashboard</Link>
            : <Link href="/auth/login" className="bg-gold-400 hover:bg-gold-300 text-navy-950 text-sm font-bold px-4 py-2 rounded transition-colors duration-150">Sign In</Link>
          }
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative min-h-96 sm:min-h-[480px] flex items-end overflow-hidden flex-shrink-0">
        <Image
          src={heroImg}
          alt={`${m.category} — ${m.brand} ${m.model}`}
          fill
          className="object-cover object-center"
          priority
          quality={90}
        />
        {/* Multi-layer overlay for deep bottom legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-950/60 to-navy-950/15" />
        <div className="absolute inset-0 bg-gradient-to-r from-navy-950/40 to-transparent" />

        {/* Hero content */}
        <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 pb-8 sm:pb-12">
          {/* Badges row */}
          <div className="flex items-center gap-2.5 mb-4">
            <span className={`text-[10px] font-bold px-3 py-1.5 rounded-full border uppercase tracking-wide backdrop-blur-sm ${statusBadge}`}>
              {statusLabel}
            </span>
            <span className="text-[10px] text-white/45 bg-navy-950/50 border border-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full uppercase tracking-wide">
              {m.category}
            </span>
          </div>

          <div className="flex items-end justify-between gap-6 flex-wrap">
            <div>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.05] mb-2">
                {m.brand} {m.model}
              </h1>
              <p className="text-white/50 text-base">{m.year} &middot; {m.use_case}</p>
            </div>
            {/* Price — visible on sm+ in hero */}
            <div className="hidden sm:block text-right flex-shrink-0">
              <p className="text-white/35 text-xs uppercase tracking-widest mb-1">Asking Price</p>
              <p className="font-display text-4xl font-bold text-gold-400">
                ${Number(m.price_usd).toLocaleString()}
              </p>
              <p className="text-white/25 text-xs mt-1">48-hr price lock included</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8">
        {/*
          Sidebar comes FIRST in DOM for correct mobile stacking (price visible immediately).
          lg:grid-cols-3 with lg:order reorders them visually on desktop:
            sidebar → right col, main → left col (2 cols wide)
        */}
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-3 lg:items-start lg:gap-8">

          {/* ── SIDEBAR (1/3 on desktop, first on mobile) ── */}
          <aside className="lg:col-span-1 lg:order-last flex flex-col gap-4 lg:sticky lg:top-[73px]">

            {/* Price card */}
            <div className="bg-navy-900 border border-white/8 rounded-2xl p-5">
              <p className="text-xs text-gold-400 font-semibold uppercase tracking-widest mb-2">Asking Price</p>
              <p className="font-display text-4xl font-bold text-gold-400 mb-1">
                ${Number(m.price_usd).toLocaleString()}
              </p>
              <div className="flex items-center gap-2.5 mb-5">
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase ${statusBadge}`}>
                  {statusLabel}
                </span>
                <span className="text-white/25 text-xs">48-hr lock on request</span>
              </div>

              {/* Key stats */}
              <div className="space-y-2.5 mb-5 pb-5 border-b border-white/8">
                <div className="flex justify-between items-center">
                  <span className="text-white/35 text-xs uppercase tracking-wider">Engine Hours</span>
                  <span className="text-white text-sm font-semibold">{m.engine_hours.toLocaleString()} hrs</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/35 text-xs uppercase tracking-wider">Yard Location</span>
                  <span className="text-white text-sm font-semibold text-right max-w-[140px]">{m.yard_city}, {m.yard_country}</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="space-y-3">
                {m.status === 'available' ? (
                  user ? (
                    <QuoteRequestButton machineId={m.id} defaultPort={buyerPort} />
                  ) : (
                    <Link
                      href="/auth/login"
                      className="block w-full text-center bg-gold-400 hover:bg-gold-300 text-navy-950 font-bold px-5 py-3.5 rounded-lg text-sm transition-colors duration-150 shadow-lg shadow-black/20"
                    >
                      Sign In to Request Quote
                    </Link>
                  )
                ) : (
                  <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-center">
                    <p className="text-white/50 text-xs">This machine is {statusLabel}</p>
                    <Link href="/auth/signup" className="text-gold-400 text-xs font-semibold hover:text-gold-300 transition-colors mt-1 block">
                      Notify me when similar arrives →
                    </Link>
                  </div>
                )}

                {user && (
                  <div className="flex gap-2.5">
                    <div className="flex-1">
                      <WatchlistButton machineId={m.id} initialWatchlisted={isWatchlisted} />
                    </div>
                    <CompareToggle machineId={m.id} initialInComparison={isInComparison} />
                  </div>
                )}
              </div>
            </div>

            {/* Live Walkthrough */}
            <div className="bg-navy-900 border border-white/8 rounded-2xl p-5">
              <p className="text-xs text-gold-400 font-semibold uppercase tracking-widest mb-1.5">Live Walkthrough</p>
              <h3 className="text-white font-semibold text-sm mb-2">Book a Video Walkthrough</h3>
              <p className="text-white/35 text-xs leading-relaxed mb-4">
                30-minute live video call with our yard team. See the machine running before you commit.
              </p>
              <CalendlyButton machineName={`${m.year} ${m.brand} ${m.model}`} />
            </div>

            {/* Freight Estimator */}
            {user && (buyerPort || freightEstimate) && (
              <div className="bg-navy-900 border border-white/8 rounded-2xl p-5">
                <p className="text-xs text-gold-400 font-semibold uppercase tracking-widest mb-3">
                  Ballpark Freight Estimate
                </p>
                {freightEstimate ? (
                  <>
                    <p className="text-white/35 text-xs mb-2">
                      To {freightEstimate.port_name}, {freightEstimate.country}
                    </p>
                    <p className="font-display text-3xl font-bold text-gold-400">
                      ~${Number(freightEstimate.base_cost_usd).toLocaleString()}
                    </p>
                    <p className="text-white/20 text-[10px] mt-1.5 leading-relaxed">
                      Base rate · Final freight in your Proforma Invoice
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-white/40 text-xs mb-1">Your preferred port:</p>
                    <p className="text-white text-sm font-semibold mb-2">{buyerPort}</p>
                    <p className="text-white/25 text-xs leading-relaxed">
                      Freight cost will be confirmed in your Proforma Invoice.
                    </p>
                  </>
                )}
                <Link href="/trust" className="text-gold-400/60 hover:text-gold-400 text-[10px] mt-3 block transition-colors duration-150">
                  How freight is calculated →
                </Link>
              </div>
            )}

            {/* Trust badges */}
            <div className="bg-navy-900 border border-white/8 rounded-2xl p-5">
              <p className="text-xs text-gold-400 font-semibold uppercase tracking-widest mb-4">Why Buy Through BlueRock</p>
              <ConfidenceBadges />
            </div>
          </aside>

          {/* ── MAIN CONTENT (2/3 on desktop, second on mobile) ── */}
          <div className="lg:col-span-2 flex flex-col gap-6">

            {/* 150-Point Inspection Badge */}
            <div className="flex items-start gap-4 bg-emerald-500/8 border border-emerald-500/20 rounded-2xl px-5 py-4">
              <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-emerald-400 font-bold">✓</span>
              </div>
              <div>
                <p className="text-emerald-400 font-semibold text-sm">150-Point Yard Inspection Completed</p>
                <p className="text-white/35 text-xs mt-1 leading-relaxed">
                  All 150 inspection points assessed by our technical team before listing.{' '}
                  <Link href="/trust" className="text-white/50 hover:text-white underline transition-colors">
                    View full inspection criteria →
                  </Link>
                </p>
              </div>
            </div>

            {/* Quick Specs Grid */}
            <div className="bg-navy-900 border border-white/8 rounded-2xl p-5 sm:p-6">
              <p className="text-xs text-white/35 font-semibold uppercase tracking-widest mb-4">Specifications</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {quickSpecs.map(spec => (
                  <div key={spec.label} className="bg-navy-950/50 border border-white/6 rounded-xl px-4 py-3.5">
                    <p className="text-white/35 text-[10px] uppercase tracking-wider mb-1">{spec.label}</p>
                    <p className="text-white font-semibold text-sm leading-tight">{spec.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Technical Details — always shown; nulls display as "—" */}
            <div className="bg-navy-900 border border-white/8 rounded-2xl p-5 sm:p-6">
              <p className="text-xs text-white/35 font-semibold uppercase tracking-widest mb-4">Technical Details</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-navy-950/50 border border-white/6 rounded-xl px-4 py-3.5">
                  <p className="text-white/35 text-[10px] uppercase tracking-wider mb-1">Engine Configuration</p>
                  <p className="text-white font-semibold text-sm leading-tight">
                    {m.engine_configuration ?? '—'}
                  </p>
                </div>
                <div className="bg-navy-950/50 border border-white/6 rounded-xl px-4 py-3.5">
                  <p className="text-white/35 text-[10px] uppercase tracking-wider mb-1">Hours Since Service</p>
                  <p className="text-white font-semibold text-sm leading-tight">
                    {m.hours_since_service ? `${Number(m.hours_since_service).toLocaleString()} hrs` : '—'}
                  </p>
                </div>
                <div className="bg-navy-950/50 border border-white/6 rounded-xl px-4 py-3.5">
                  <p className="text-white/35 text-[10px] uppercase tracking-wider mb-1">Operating Weight</p>
                  <p className="text-white font-semibold text-sm leading-tight">
                    {m.operating_weight_kg ? `${Number(m.operating_weight_kg).toLocaleString()} kg` : '—'}
                  </p>
                </div>
                <div className="bg-navy-950/50 border border-white/6 rounded-xl px-4 py-3.5">
                  <p className="text-white/35 text-[10px] uppercase tracking-wider mb-1">Serial Number</p>
                  <p className="text-white font-semibold text-sm leading-tight font-mono tracking-wide">
                    {m.serial_number ?? '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* Category-specific specs (Bucket Capacity, Blade Width, etc.) */}
            {categorySpecs.length > 0 && (
              <div className="bg-navy-900 border border-white/8 rounded-2xl p-5 sm:p-6">
                <p className="text-xs text-white/35 font-semibold uppercase tracking-widest mb-4">
                  {m.category} Specifications
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {categorySpecs.map(([key, value]) => (
                    <div key={key} className="bg-navy-950/50 border border-white/6 rounded-xl px-4 py-3.5">
                      <p className="text-white/35 text-[10px] uppercase tracking-wider mb-1">{key}</p>
                      <p className="text-white font-semibold text-sm leading-tight">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {m.description && (
              <div className="bg-navy-900 border border-white/8 rounded-2xl p-5 sm:p-6">
                <p className="text-xs text-white/35 font-semibold uppercase tracking-widest mb-3">About This Machine</p>
                <p className="text-white/65 text-sm leading-relaxed">{m.description}</p>
              </div>
            )}

            {/* Component Wear Analysis */}
            {Object.keys(wearAnalysis).length > 0 && (
              <div className="bg-navy-900 border border-white/8 rounded-2xl p-5 sm:p-6">
                <p className="text-xs text-white/35 font-semibold uppercase tracking-widest mb-4">Component Wear Analysis</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {Object.entries(wearAnalysis).map(([component, status]) => {
                    const w = WEAR[status] ?? { badge: 'bg-white/10 border-white/15 text-white/50', label: status.replace(/_/g, ' ') }
                    return (
                      <div
                        key={component}
                        className="flex items-center justify-between px-4 py-3 bg-navy-950/40 border border-white/6 rounded-xl hover:border-white/12 transition-colors duration-150"
                      >
                        <span className="text-white/65 text-sm capitalize">{component.replace(/_/g, ' ')}</span>
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border capitalize flex-shrink-0 ml-3 ${w.badge}`}>
                          {w.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Media */}
            <div className="bg-navy-900 border border-white/8 rounded-2xl p-5 sm:p-6">
              <p className="text-xs text-white/35 font-semibold uppercase tracking-widest mb-4">Media</p>

              {mediaUrls.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  {mediaUrls.map((url: string, i: number) => (
                    <div key={i} className="relative h-44 rounded-xl overflow-hidden group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={`${m.brand} ${m.model} — photo ${i + 1}`}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-navy-950/20 group-hover:bg-navy-950/0 transition-colors duration-300 rounded-xl" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-white/25 text-sm mb-4 italic">Photos coming soon.</p>
              )}

              {m.video_url && (
                <a
                  href={m.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-gold-400 hover:text-gold-300 font-medium transition-colors duration-150"
                >
                  <span className="w-7 h-7 rounded-full bg-gold-400/15 border border-gold-400/30 flex items-center justify-center text-xs">▶</span>
                  Watch Video Walkthrough
                </a>
              )}
            </div>

            {/* Inspection Report */}
            <div className="bg-navy-900 border border-white/8 rounded-2xl p-5 sm:p-6">
              <p className="text-xs text-white/35 font-semibold uppercase tracking-widest mb-3">Inspection Report</p>
              {m.inspection_report_url ? (
                <a
                  href={m.inspection_report_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-navy-950/50 hover:bg-navy-800 border border-white/10 hover:border-white/25 text-white px-5 py-3 rounded-lg text-sm font-medium transition-all duration-150"
                >
                  <span className="text-gold-400">&#x1F4C4;</span>
                  Download Inspection Report PDF
                </a>
              ) : (
                <p className="text-white/25 text-sm italic">Inspection report pending generation.</p>
              )}
            </div>

          </div>
        </div>

        {/* ── FULL-WIDTH CTA (logged-out guests only) ── */}
        {!user && (
          <div className="mt-8 bg-navy-900 border border-white/8 rounded-2xl px-6 py-8 text-center">
            <p className="text-xs text-gold-400 font-semibold uppercase tracking-widest mb-3">Ready to Proceed?</p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mb-3">
              Request a Quote for This Machine
            </h2>
            <p className="text-white/40 text-sm max-w-md mx-auto mb-7 leading-relaxed">
              Sign in to request a delivery quote, access your Document Vault, and track your transaction through all 6 milestone phases.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/auth/login"
                className="bg-gold-400 hover:bg-gold-300 text-navy-950 font-bold px-9 py-3.5 rounded-lg text-sm transition-colors duration-150 shadow-xl shadow-black/30"
              >
                Sign In to Request Quote
              </Link>
              <Link
                href="/auth/signup"
                className="border border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 text-white font-semibold px-9 py-3.5 rounded-lg text-sm transition-all duration-150"
              >
                Apply for Access
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* ── FOOTER ── */}
      <footer className="bg-navy-950 border-t border-white/5 py-8 px-6 mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <Link href="/">
              <Image src={logo} alt="BlueRock Equipment" className="h-8 w-auto object-contain invert opacity-75" />
            </Link>
            <p className="text-xs mt-1.5 text-white/20">Premium Direct-Sale Heavy Machinery</p>
          </div>
          <nav className="flex gap-5 text-xs text-white/30">
            <Link href="/machines"  className="hover:text-white transition-colors duration-150">Inventory</Link>
            <Link href="/trust"     className="hover:text-white transition-colors duration-150">Trust Hub</Link>
            <Link href="/dashboard" className="hover:text-white transition-colors duration-150">Dashboard</Link>
          </nav>
        </div>
      </footer>

      {user && <ComparisonTray />}
    </div>
  )
}
