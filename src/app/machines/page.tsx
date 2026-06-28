import { createClient } from '@/lib/supabase/server'
import { adminSupabase } from '@/lib/supabase/admin'
import MachineCard from '@/components/machine/MachineCard'
import ComparisonTray from '@/components/comparison/ComparisonTray'
import MobileFilterDrawer from '@/components/machine/MobileFilterDrawer'
import NavSignOutButton from '@/components/NavSignOutButton'
import PublicMobileNav from '@/components/PublicMobileNav'
import Link from 'next/link'
import Image from 'next/image'
import logo from '@/assests/img/logo.jpg'
import heroImg from '@/assests/img/machinery/machine-detail-excavator-urban-site.jpg'

const CATEGORIES = ['Excavators', 'Bulldozers', 'Wheel Loaders', 'Motor Graders', 'Articulated Trucks']
const BRANDS    = ['Caterpillar', 'Komatsu', 'Volvo', 'Sany', 'Hitachi', 'Liebherr']
const USE_CASES = ['Construction', 'Mining & Quarrying', 'Port Operations', 'Road Building']

/* Inline SVG icons for each category filter pill */
const CAT_ICONS: Record<string, React.ReactElement> = {
  All: (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
      <rect x="1" y="1" width="6" height="6" rx="1" />
      <rect x="9" y="1" width="6" height="6" rx="1" />
      <rect x="1" y="9" width="6" height="6" rx="1" />
      <rect x="9" y="9" width="6" height="6" rx="1" />
    </svg>
  ),
  Excavators: (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 16 L2 9 L6 9" />
      <path d="M6 9 L12 4" />
      <path d="M12 4 L17 8 L14 13 L9 10 Z" />
      <path d="M2 16 L18 16" />
    </svg>
  ),
  Bulldozers: (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="10" width="14" height="5" rx="1" />
      <path d="M3 10 L5 6 L15 6 L17 10" />
      <path d="M1 8 L4 5 L4 10" />
    </svg>
  ),
  'Wheel Loaders': (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5" cy="14" r="3" />
      <circle cx="14" cy="14" r="3" />
      <path d="M5 11 L8 11 L8 6 L11 4 L14 6 L14 11" />
    </svg>
  ),
  'Motor Graders': (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 15 L19 15" />
      <path d="M3 10 L17 12" />
      <rect x="6" y="5" width="8" height="5" rx="1" />
      <circle cx="4" cy="15" r="2" />
      <circle cx="16" cy="15" r="2" />
    </svg>
  ),
  'Articulated Trucks': (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="7" width="8" height="7" rx="1" />
      <rect x="10" y="5" width="9" height="9" rx="1" />
      <circle cx="3" cy="16" r="2" />
      <circle cx="12" cy="16" r="2" />
      <circle cx="17" cy="16" r="2" />
    </svg>
  ),
}

/* Build a /machines URL preserving current params + applying overrides.
   Pass null to remove a param. */
function buildHref(
  current: { category?: string; brand?: string; use_case?: string; view?: string },
  overrides: Partial<{ category: string | null; brand: string | null; use_case: string | null; view: string | null }>
): string {
  const next: Record<string, string> = {}
  if (current.category)  next.category  = current.category
  if (current.brand)     next.brand     = current.brand
  if (current.use_case)  next.use_case  = current.use_case
  if (current.view)      next.view      = current.view
  for (const [k, v] of Object.entries(overrides)) {
    if (v == null) { delete next[k] } else { next[k] = v }
  }
  const qs = Object.entries(next)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&')
  return `/machines${qs ? '?' + qs : ''}`
}

export default async function MachinesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; brand?: string; use_case?: string; view?: string }>
}) {
  const supabase = await createClient()
  const params = await searchParams

  const { data: { user } } = await supabase.auth.getUser()
  const isAdmin = !!user && user.email === process.env.ADMIN_EMAIL

  let query = supabase
    .from('machines')
    .select('*')
    .order('created_at', { ascending: false })

  if (params.category) query = query.eq('category', params.category)
  if (params.brand)    query = query.eq('brand', params.brand)
  if (params.use_case) query = query.eq('use_case', params.use_case)

  const { data: machines, error } = await query

  if (error) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center p-8">
        <p className="text-red-400 text-sm">Error loading machines: {error.message}</p>
      </div>
    )
  }

  let watchlistedIds = new Set<string>()
  let comparisonIds  = new Set<string>()
  if (user) {
    const { data: wl } = await adminSupabase
      .from('watchlist')
      .select('machine_id, in_comparison')
      .eq('buyer_id', user.id)
    for (const w of wl ?? []) {
      watchlistedIds.add(w.machine_id)
      if (w.in_comparison) comparisonIds.add(w.machine_id)
    }
  }

  const isListView = params.view === 'list'
  const hasFilters = !!(params.category || params.brand || params.use_case)
  const count = machines?.length ?? 0

  /* Pill class helper */
  const pill = (active: boolean) =>
    `flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-all duration-150 whitespace-nowrap select-none ${
      active
        ? 'bg-gold-400/15 border-gold-400/55 text-gold-300'
        : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70 hover:border-white/25'
    }`

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col">

      {/* ── STICKY NAV + FILTER WRAPPER ── */}
      <div className="sticky top-0 z-50">

        {/* Nav */}
        <header className="bg-navy-950/96 backdrop-blur-md border-b border-white/8 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Image src={logo} alt="BlueRock Equipment" className="h-9 w-auto object-contain invert opacity-90" />
            </Link>
            <span className="hidden sm:inline text-xs text-gold-400 font-semibold uppercase tracking-widest">
              Fleet Inventory
            </span>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/trust" className="text-sm text-white/45 hover:text-white hidden sm:block transition-colors duration-150">
              Trust Hub
            </Link>
            {user ? (
              <>
                <Link href="/dashboard" className="text-sm text-white/55 hover:text-white hidden sm:block transition-colors duration-150">
                  Dashboard
                </Link>
                {isAdmin && (
                  <Link href="/admin" className="text-sm text-gold-400 hover:text-gold-300 hidden sm:block transition-colors duration-150">
                    Admin Panel
                  </Link>
                )}
                <NavSignOutButton className="text-sm text-white/55 hover:text-white transition-colors duration-150" />
              </>
            ) : (
              <Link href="/auth/login" className="bg-gold-400 hover:bg-gold-300 text-navy-950 text-sm font-bold px-4 py-2 rounded transition-colors duration-150 shadow-md shadow-black/30">
                Sign In
              </Link>
            )}
            <PublicMobileNav isLoggedIn={!!user} isAdmin={isAdmin} />
          </div>
        </header>

        {/* Filter Bar */}
        <div className="bg-navy-900/96 backdrop-blur-md border-b border-white/8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-2">

            {/* Mobile: drawer trigger */}
            <div className="flex md:hidden flex-1 py-2.5">
              <MobileFilterDrawer
                category={params.category}
                brand={params.brand}
                use_case={params.use_case}
                view={params.view}
              />
            </div>

            {/* Desktop: scrollable pills */}
            <div className="hidden md:flex flex-1 overflow-x-auto scrollbar-hide">
              <div className="flex items-center gap-1.5 py-3 min-w-max pr-2">

                {/* All */}
                <Link href={buildHref(params, { category: null, brand: null, use_case: null })} className={pill(!hasFilters)}>
                  {CAT_ICONS.All}
                  All
                </Link>

                <div className="w-px h-4 bg-white/10 mx-1 flex-shrink-0" />

                {/* Categories */}
                {CATEGORIES.map(cat => (
                  <Link
                    key={cat}
                    href={buildHref(params, { category: params.category === cat ? null : cat })}
                    className={pill(params.category === cat)}
                  >
                    {CAT_ICONS[cat]}
                    {cat}
                  </Link>
                ))}

                <div className="w-px h-4 bg-white/10 mx-1 flex-shrink-0" />

                {/* Brands */}
                {BRANDS.map(brand => (
                  <Link
                    key={brand}
                    href={buildHref(params, { brand: params.brand === brand ? null : brand })}
                    className={pill(params.brand === brand)}
                  >
                    {brand}
                  </Link>
                ))}

                <div className="w-px h-4 bg-white/10 mx-1 flex-shrink-0" />

                {/* Use Cases */}
                {USE_CASES.map(uc => (
                  <Link
                    key={uc}
                    href={buildHref(params, { use_case: params.use_case === uc ? null : uc })}
                    className={pill(params.use_case === uc)}
                  >
                    {uc}
                  </Link>
                ))}
              </div>
            </div>

            {/* View Toggle */}
            <div className="flex-shrink-0 border-l border-white/10 pl-3 py-3 flex items-center gap-0.5">
              <Link
                href={buildHref(params, { view: null })}
                title="Grid view"
                className={`p-2 rounded-lg transition-colors duration-150 ${!isListView ? 'text-gold-400 bg-gold-400/10' : 'text-white/30 hover:text-white/60'}`}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <rect x="1" y="1" width="6" height="6" rx="1" />
                  <rect x="9" y="1" width="6" height="6" rx="1" />
                  <rect x="1" y="9" width="6" height="6" rx="1" />
                  <rect x="9" y="9" width="6" height="6" rx="1" />
                </svg>
              </Link>
              <Link
                href={buildHref(params, { view: 'list' })}
                title="List view"
                className={`p-2 rounded-lg transition-colors duration-150 ${isListView ? 'text-gold-400 bg-gold-400/10' : 'text-white/30 hover:text-white/60'}`}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <rect x="1" y="2"    width="14" height="2.5" rx="1" />
                  <rect x="1" y="6.75" width="14" height="2.5" rx="1" />
                  <rect x="1" y="11.5" width="14" height="2.5" rx="1" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── HERO ── */}
      <section className="relative h-52 sm:h-60 overflow-hidden flex-shrink-0">
        <Image
          src={heroImg}
          alt="Construction excavator with workers on an active urban job site"
          fill
          className="object-cover object-center"
          priority
          quality={85}
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-navy-950/55 via-navy-950/25 to-navy-950/85" />
        <div className="absolute inset-0 bg-gradient-to-r from-navy-950/45 to-transparent" />
        <div className="relative z-10 h-full flex flex-col justify-end px-6 sm:px-8 pb-8 max-w-7xl mx-auto w-full">
          <p className="text-xs text-gold-400 font-semibold uppercase tracking-widest mb-2">Fleet Inventory</p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-white leading-tight">
            Browse Our Fleet
          </h1>
        </div>
      </section>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">

        {/* Stats row */}
        <div className="flex items-center flex-wrap gap-x-4 gap-y-1.5 mb-4">
          <p className="text-white text-sm">
            <span className="font-semibold">{count}</span>
            <span className="text-white/35"> machine{count !== 1 ? 's' : ''} available</span>
          </p>
          <span className="text-white/15 hidden sm:inline">|</span>
          <p className="text-white/35 text-sm hidden sm:block">Updated today</p>
          <span className="text-white/15 hidden sm:inline">|</span>
          <p className="text-sm text-gold-500 font-medium">✓ Ready to ship</p>
        </div>

        {/* Active filter badges */}
        {hasFilters && (
          <div className="flex items-center flex-wrap gap-2 mb-6">
            {params.category && (
              <Link
                href={buildHref(params, { category: null })}
                className="flex items-center gap-1.5 text-xs bg-gold-400/10 border border-gold-400/30 text-gold-300 px-2.5 py-1 rounded-full hover:bg-gold-400/20 transition-colors duration-150"
              >
                {params.category}
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M1 1l8 8M9 1L1 9"/></svg>
              </Link>
            )}
            {params.brand && (
              <Link
                href={buildHref(params, { brand: null })}
                className="flex items-center gap-1.5 text-xs bg-gold-400/10 border border-gold-400/30 text-gold-300 px-2.5 py-1 rounded-full hover:bg-gold-400/20 transition-colors duration-150"
              >
                {params.brand}
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M1 1l8 8M9 1L1 9"/></svg>
              </Link>
            )}
            {params.use_case && (
              <Link
                href={buildHref(params, { use_case: null })}
                className="flex items-center gap-1.5 text-xs bg-gold-400/10 border border-gold-400/30 text-gold-300 px-2.5 py-1 rounded-full hover:bg-gold-400/20 transition-colors duration-150"
              >
                {params.use_case}
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M1 1l8 8M9 1L1 9"/></svg>
              </Link>
            )}
            <Link
              href={buildHref(params, { category: null, brand: null, use_case: null })}
              className="text-xs text-white/30 hover:text-white/60 transition-colors duration-150 ml-1"
            >
              Clear all
            </Link>
          </div>
        )}

        {/* Empty state */}
        {!machines || count === 0 ? (
          <div className="text-center py-28">
            <div className="text-white/10 text-7xl mb-5">⛏</div>
            <p className="text-white/35 text-sm mb-6">No machines found matching your filters.</p>
            <Link
              href="/machines"
              className="text-gold-400 hover:text-gold-300 text-sm font-semibold transition-colors duration-150"
            >
              Clear filters →
            </Link>
          </div>
        ) : isListView ? (
          /* List layout */
          <div className="flex flex-col gap-3">
            {machines.map(machine => (
              <MachineCard
                key={machine.id}
                machine={machine}
                isWatchlisted={watchlistedIds.has(machine.id)}
                isInComparison={comparisonIds.has(machine.id)}
                showActions={!!user}
                viewMode="list"
              />
            ))}
          </div>
        ) : (
          /* Grid layout */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {machines.map(machine => (
              <MachineCard
                key={machine.id}
                machine={machine}
                isWatchlisted={watchlistedIds.has(machine.id)}
                isInComparison={comparisonIds.has(machine.id)}
                showActions={!!user}
                viewMode="grid"
              />
            ))}
          </div>
        )}
      </main>

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
            <Link href="/"      className="hover:text-white transition-colors duration-150">Home</Link>
            <Link href="/trust" className="hover:text-white transition-colors duration-150">Trust Hub</Link>
            <Link href="/auth/login" className="hover:text-white transition-colors duration-150">Sign In</Link>
          </nav>
        </div>
      </footer>

      {user && <ComparisonTray />}
    </div>
  )
}
