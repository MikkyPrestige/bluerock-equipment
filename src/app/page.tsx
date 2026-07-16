import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import logo from '@/assests/img/logo.jpg'
import NavSignOutButton from '@/components/NavSignOutButton'
import MobileNav from '@/components/MobileNav'
import heroImg from '@/assests/img/machinery/hero-excavator-openpit-mine.jpg'
import ctaBgImg from '@/assests/img/machinery/hero-industrial-port-sunrise.jpg'
import excImg from '@/assests/img/machinery/machine-card-excavator-openpit.jpg'
import bullImg from '@/assests/img/machinery/machine-card-bulldozer-field.jpg'
import loaderImg from '@/assests/img/machinery/machine-card-wheel-loader-gravel.jpg'
import graderImg from '@/assests/img/machinery/machine-card-motor-grader-road.jpg'
import truckImg from '@/assests/img/machinery/freight-port-crane-containers.jpg'
import compactorImg from '@/assests/img/machinery/yard-operations-aerial-storage.jpg'

const STATS = [
  { value: '150-Point', label: 'Yard Inspection' },
  { value: '48-Hour', label: 'Price Lock' },
  { value: '6-Phase', label: 'Milestone Tracker' },
  { value: '100%', label: 'Direct — No Brokers' },
]

const CATEGORIES = [
  { name: 'Excavators', slug: 'Excavators', image: excImg, desc: 'Mining, quarry & civil works' },
  { name: 'Bulldozers', slug: 'Bulldozers', image: bullImg, desc: 'Earthmoving & land clearing' },
  { name: 'Wheel Loaders', slug: 'Wheel Loaders', image: loaderImg, desc: 'Material handling & loading' },
  { name: 'Motor Graders', slug: 'Motor Graders', image: graderImg, desc: 'Road grading & leveling' },
  { name: 'Articulated Trucks', slug: 'Articulated Trucks', image: truckImg, desc: 'Heavy haulage & site transport' },
  { name: 'Compactors', slug: 'Compactors', image: compactorImg, desc: 'Soil & asphalt compaction' },
]

const HOW_IT_WORKS = [
  { step: 1, title: 'Browse & Save', body: 'Filter inventory by category, brand, and use case. Save machines to your watchlist.' },
  { step: 2, title: 'Request a Quote', body: 'Submit a quote request with your port of discharge. Receive a proforma invoice within 24 hours.' },
  { step: 3, title: 'Review & Confirm', body: 'Accept the proforma, confirm terms, and transfer payment via wire or letter of credit.' },
  { step: 4, title: 'Export & Delivery', body: 'We handle the full export documentation package — B/L, export certificate, customs manifest, packing list.' },
]

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isAdmin  = !!user && user.email === process.env.ADMIN_EMAIL

  return (
    <div className="min-h-screen flex flex-col bg-navy-950">

      {/* ── NAV (absolute over hero) ── */}
      <header className="absolute top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Image
                src={logo}
                alt="BlueRock Equipment"
                className="h-9 w-auto object-contain invert opacity-90"
              />
            </Link>
            <span className="hidden sm:inline text-xs text-gold-400 font-semibold uppercase tracking-widest">
              Premium Direct-Sale
            </span>
          </div>
          <nav className="flex items-center gap-5 sm:gap-7">
            <Link href="/machines" className="text-sm text-white/70 hover:text-white hidden sm:block transition-colors duration-150">
              Inventory
            </Link>
            <Link href="/trust" className="text-sm text-white/70 hover:text-white hidden sm:block transition-colors duration-150">
              Trust Hub
            </Link>
            {user ? (
              <>
                <Link href="/dashboard" className="text-sm text-white/70 hover:text-white hidden sm:block transition-colors duration-150">
                  Dashboard
                </Link>
                {isAdmin && (
                  <Link href="/admin" className="text-sm text-gold-400 hover:text-gold-300 hidden sm:block transition-colors duration-150">
                    Admin Panel
                  </Link>
                )}
                <NavSignOutButton className="text-sm text-white/70 hover:text-white hidden sm:block transition-colors duration-150" />
              </>
            ) : (
              <>
                <Link href="/auth/login" className="text-sm text-white/70 hover:text-white hidden sm:block transition-colors duration-150">
                  Sign In
                </Link>
                <Link
                  href="/machines"
                  className="bg-gold-400 hover:bg-gold-300 text-navy-950 text-sm font-bold px-5 py-2.5 rounded transition-colors duration-150 shadow-lg shadow-black/30"
                >
                  Browse Inventory
                </Link>
              </>
            )}
            <MobileNav isLoggedIn={!!user} isAdmin={isAdmin} />
          </nav>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <Image
          src={heroImg}
          alt="Massive industrial excavator operating in an open-pit mine"
          fill
          className="object-cover object-center"
          priority
          quality={90}
          sizes="100vw"
        />
        {/* Layered dark overlays for text legibility + mood */}
        <div className="absolute inset-0 bg-gradient-to-b from-navy-950/80 via-navy-950/25 to-navy-950/90" />
        <div className="absolute inset-0 bg-gradient-to-r from-navy-950/50 via-transparent to-navy-950/30" />

        <div className="relative z-10 text-center px-6 max-w-5xl mx-auto pt-20">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 border border-gold-400/40 bg-gold-400/10 text-gold-300 text-xs font-semibold px-5 py-2 rounded-full mb-8 uppercase tracking-widest backdrop-blur-sm">
            ✓&nbsp;150-Point Inspected &nbsp;·&nbsp; Direct Seller &nbsp;·&nbsp; Export Ready
          </div>

          {/* Headline */}
          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-[1.05] mb-6">
            Premium Heavy Machinery,
            <br />
            <em className="text-gold-400 not-italic">Direct from the Yard</em>
          </h1>

          <p className="text-lg sm:text-xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed">
            No brokers. No markups. Every machine is 150-point inspected, photographed,
            and ready to ship with a complete export documentation package.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/machines"
              className="bg-gold-400 hover:bg-gold-300 text-navy-950 font-bold px-10 py-4 rounded text-base transition-colors duration-150 shadow-xl shadow-black/40"
            >
              Browse Inventory
            </Link>
            <Link
              href="/trust"
              className="border border-white/30 hover:border-white/60 bg-white/5 hover:bg-white/10 backdrop-blur-sm text-white font-semibold px-10 py-4 rounded text-base transition-all duration-150"
            >
              How It Works
            </Link>
          </div>

          {/* Scroll nudge */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/25">
            <span className="text-[10px] uppercase tracking-[0.2em]">Scroll</span>
            <div className="w-px h-8 bg-gradient-to-b from-white/30 to-transparent" />
          </div>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section className="bg-navy-900 border-y border-white/5 py-9 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6">
          {STATS.map(({ value, label }, i) => (
            <div
              key={label}
              className={`text-center ${i > 0 ? 'sm:border-l border-white/8 sm:pl-6' : ''}`}
            >
              <p className="font-display text-2xl sm:text-3xl font-bold text-gold-400">{value}</p>
              <p className="text-xs text-white/35 mt-1.5 uppercase tracking-widest">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── EQUIPMENT CATEGORIES ── */}
      <section className="py-24 px-6 bg-navy-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs text-gold-400 font-semibold uppercase tracking-widest mb-3">Equipment We Carry</p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
              Built for Every Job Site
            </h2>
            <p className="text-white/40 text-base max-w-xl mx-auto leading-relaxed">
              Available for immediate export to Europe, Africa, Middle East, Asia, and the Americas.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {CATEGORIES.map(cat => (
              <Link
                key={cat.name}
                href={`/machines?category=${encodeURIComponent(cat.slug)}`}
                className="group relative h-72 rounded-xl overflow-hidden block"
              >
                <Image
                  src={cat.image}
                  alt={cat.name}
                  fill
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                {/* Base gradient — content legibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-navy-950/90 via-navy-950/35 to-navy-950/10" />
                {/* Hover gold ring */}
                <div className="absolute inset-0 rounded-xl ring-inset ring-0 group-hover:ring-2 ring-gold-400/50 transition-all duration-300" />

                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <p className="text-white/45 text-xs uppercase tracking-widest mb-1.5 group-hover:text-gold-400 transition-colors duration-200">
                    {cat.desc}
                  </p>
                  <h3 className="font-display text-xl font-bold text-white">{cat.name}</h3>
                  <div className="flex items-center gap-1.5 mt-3 text-gold-400 text-xs font-semibold opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-250">
                    View Inventory
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link
              href="/machines"
              className="inline-flex items-center gap-2 text-gold-400 hover:text-gold-300 text-sm font-semibold transition-colors duration-150"
            >
              View all available machines
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-24 px-6 bg-navy-950">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs text-gold-400 font-semibold uppercase tracking-widest mb-3">Process</p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
              How a Transaction Works
            </h2>
            <p className="text-white/35 text-base max-w-xl mx-auto leading-relaxed">
              From quote request to delivery — fully documented, 6-phase milestone tracker included.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 lg:gap-12">
            {HOW_IT_WORKS.map(({ step, title, body }) => (
              <div key={step} className="flex gap-5 group">
                <div className="flex-shrink-0">
                  <div className="w-11 h-11 rounded-full bg-gold-400/10 border border-gold-400/30 text-gold-400 flex items-center justify-center text-sm font-bold font-display group-hover:bg-gold-400 group-hover:text-navy-950 group-hover:border-gold-400 transition-all duration-200">
                    {step}
                  </div>
                </div>
                <div className="pt-1">
                  <h3 className="font-semibold text-white text-base mb-2 group-hover:text-gold-300 transition-colors duration-150">
                    {title}
                  </h3>
                  <p className="text-white/40 text-sm leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-14 text-center">
            <Link
              href="/trust"
              className="inline-flex items-center gap-2 text-gold-400 hover:text-gold-300 text-sm font-semibold transition-colors duration-150"
            >
              Full Trust & Verification Hub
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="relative py-32 px-6 overflow-hidden">
        <Image
          src={ctaBgImg}
          alt="Aerial view of industrial port at sunrise"
          fill
          className="object-cover object-center"
          quality={85}
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-navy-950/80" />

        <div className="relative z-10 max-w-2xl mx-auto text-center">
          <p className="text-xs text-gold-400 font-semibold uppercase tracking-widest mb-4">Closed Buyer Group</p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-5">
            Ready to find your machine?
          </h2>
          <p className="text-white/45 text-base mb-9 leading-relaxed">
            Sign up to request quotes, track shipments, and access your Document Vault. Currently accepting applications.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/signup"
              className="bg-gold-400 hover:bg-gold-300 text-navy-950 font-bold px-10 py-4 rounded text-sm transition-colors duration-150 shadow-xl shadow-black/40"
            >
              Apply for Access
            </Link>
            <Link
              href="/machines"
              className="border border-white/25 hover:border-white/50 bg-white/5 hover:bg-white/10 text-white font-semibold px-10 py-4 rounded text-sm transition-all duration-150"
            >
              Browse First
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-navy-950 border-t border-white/5 py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <Link href="/">
              <Image
                src={logo}
                alt="BlueRock Equipment"
                className="h-9 w-auto object-contain invert opacity-90"
              />
            </Link>
            <p className="text-xs mt-2 text-white/20">Premium Direct-Sale Heavy Machinery</p>
          </div>
          <nav className="flex gap-6 text-xs text-white/30">
            <Link href="/machines" className="hover:text-white transition-colors duration-150">Inventory</Link>
            <Link href="/trust" className="hover:text-white transition-colors duration-150">Trust Hub</Link>
            <Link href="/auth/login" className="hover:text-white transition-colors duration-150">Buyer Login</Link>
            <Link href="/auth/signup" className="hover:text-white transition-colors duration-150">Apply</Link>
          </nav>
        </div>
      </footer>

    </div>
  )
}
