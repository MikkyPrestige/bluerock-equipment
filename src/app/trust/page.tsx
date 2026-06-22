import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import logo from '@/assests/img/logo.jpg'
import trustHeroImg from '@/assests/img/machinery/trust-hub-aerial-construction-site.jpg'
import NavSignOutButton from '@/components/NavSignOutButton'

export const metadata: Metadata = {
  title: 'Trust & Verification Hub',
  description: 'How BlueRock Equipment verifies every machine, protects buyers, and handles the complete export documentation package.',
}

const INSPECTION_CATEGORIES = [
  {
    title: 'Engine & Power System',
    count: 28,
    checks: ['Engine block integrity', 'Oil pressure & consumption', 'Coolant system', 'Belts & tensioners', 'Fuel injectors & pump', 'Turbocharger', 'Air filtration'],
  },
  {
    title: 'Hydraulic System',
    count: 22,
    checks: ['Main pump output', 'Cylinder seals & rods', 'Control valves', 'Hose condition', 'Hydraulic fluid', 'Boom & arm movement', 'Bucket cylinder'],
  },
  {
    title: 'Undercarriage & Drive',
    count: 24,
    checks: ['Track tension & wear', 'Rollers & idlers', 'Sprocket teeth', 'Track pads', 'Drive motor', 'Final drive oil', 'Track frame integrity'],
  },
  {
    title: 'Structural Integrity',
    count: 18,
    checks: ['Main frame welds', 'Boom cracks / repairs', 'Bucket & teeth', 'Blade surface', 'Counterweight', 'Slew ring bearing', 'Swing motor'],
  },
  {
    title: 'Electrical Systems',
    count: 20,
    checks: ['Battery & alternator', 'Instrument cluster', 'Warning lights', 'Work lights', 'Starter motor', 'Sensor readings', 'Wiring harness'],
  },
  {
    title: 'Cab & Operator Environment',
    count: 16,
    checks: ['ROPS integrity', 'Seat & seatbelt', 'HVAC function', 'Windscreen', 'Joystick controls', 'Decals & placards', 'Access steps & handrails'],
  },
  {
    title: 'Drivetrain & Transmission',
    count: 14,
    checks: ['Transmission shift quality', 'Torque converter', 'Axle seals', 'Differential', 'Parking brake', 'Service brake response', 'Propshaft joints'],
  },
  {
    title: 'Fluids & Lubrication',
    count: 8,
    checks: ['Engine oil level & condition', 'Hydraulic fluid condition', 'Coolant concentration', 'Gear oil', 'Grease points', 'Air filter restriction', 'DEF/AdBlue level'],
  },
]

const EXPORT_DOCS = [
  { doc: 'Proforma Invoice',    phase: 'Phase 1', desc: 'Itemised price breakdown with freight estimate, valid for 48 hours with price lock.' },
  { doc: 'Bill of Lading',      phase: 'Phase 4', desc: 'Title transfer document issued by shipping line upon loading at port of origin.' },
  { doc: 'Export Certificate',  phase: 'Phase 4', desc: 'Government-issued certificate confirming the equipment is legally cleared for export.' },
  { doc: 'Packing List',        phase: 'Phase 4', desc: 'Detailed list of all items shipped, required for customs clearance at destination port.' },
  { doc: 'Customs Manifest',    phase: 'Phase 4', desc: 'Formal declaration of goods for origin customs — required for international shipment.' },
]

const MILESTONES = [
  { phase: 0, label: 'Quote Requested',    desc: 'Buyer submits port of discharge and delivery requirements.' },
  { phase: 1, label: 'Proforma Issued',    desc: 'Admin confirms machine price, freight, and customs estimate.' },
  { phase: 2, label: 'Buyer Accepted',     desc: 'Buyer confirms terms and submits deposit.' },
  { phase: 3, label: 'Payment Confirmed',  desc: 'Full payment received via wire transfer or Letter of Credit.' },
  { phase: 4, label: 'Export Docs Issued', desc: 'B/L, export certificate, packing list, and customs manifest provided.' },
  { phase: 5, label: 'In Transit',         desc: 'Equipment loaded and en route to destination port.' },
  { phase: 6, label: 'Delivered',          desc: 'Equipment arrives and buyer takes possession.' },
]

const BUYER_PROTECTION = [
  {
    title: 'KYC-Verified Buyer Community',
    body: 'Every buyer completes corporate identity verification (company name, address, import/export licence) before receiving quote access. Max 10 verified members.',
  },
  {
    title: '48-Hour Price Lock',
    body: 'Once you request a quote, the machine price is locked for 48 hours while you review the proforma invoice. No price changes during the lock window.',
  },
  {
    title: 'Proforma Before Payment',
    body: 'You receive a fully itemised proforma invoice — machine price, freight, customs estimate, total — before any payment is requested.',
  },
  {
    title: 'Direct Seller — No Broker',
    body: 'BlueRock owns every machine in our yard. There are no brokers, intermediaries, or third-party listings. You negotiate directly with the seller.',
  },
  {
    title: 'Payment Methods',
    body: 'Bank Wire Transfer (T/T) and Letter of Credit (L/C) are accepted. Payment is confirmed before we release any export documentation.',
  },
  {
    title: 'Live Video Walkthrough',
    body: 'Before committing, you can book a 30-minute live video walkthrough with our yard team. We will show you the machine running and answer your questions in real time.',
  },
]

export default async function TrustPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isAdmin = !!user && user.email === process.env.ADMIN_EMAIL

  const totalChecks = INSPECTION_CATEGORIES.reduce((s, c) => s + c.count, 0)

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col">

      {/* ── NAV ── */}
      <header className="bg-navy-950 border-b border-white/8 px-6 py-4 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Image src={logo} alt="BlueRock Equipment" className="h-9 w-auto object-contain invert opacity-90" />
            </Link>
            <span className="hidden sm:inline text-xs text-gold-400 font-semibold uppercase tracking-widest">
              Premium Direct-Sale
            </span>
          </div>
          <nav className="flex items-center gap-5 sm:gap-7">
            <Link href="/machines" className="text-sm text-white/55 hover:text-white hidden sm:block transition-colors duration-150">Inventory</Link>
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
              <>
                <Link href="/auth/login" className="text-sm text-white/55 hover:text-white hidden sm:block transition-colors duration-150">
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
          </nav>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative py-28 px-6 overflow-hidden">
        <Image
          src={trustHeroImg}
          alt="Aerial view of a construction site with excavators, road rollers, and bulldozers"
          fill
          className="object-cover object-center"
          priority
          quality={90}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-navy-950/85 via-navy-950/55 to-navy-950/90" />

        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <p className="text-xs text-gold-400 font-semibold uppercase tracking-widest mb-4">Trust & Verification Hub</p>
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-white mb-5 leading-tight">
            Built for Buyers Who<br />Do Their Due Diligence
          </h1>
          <p className="text-white/55 text-lg max-w-xl mx-auto leading-relaxed">
            Every machine has passed a {totalChecks}-point yard inspection, been photographed
            in the yard, and is backed by a complete export documentation package.
          </p>
        </div>
      </section>

      <main className="max-w-5xl mx-auto px-6 py-16 space-y-20 flex-1">

        {/* ── 150-POINT INSPECTION ── */}
        <section>
          <div className="text-center mb-10">
            <span className="inline-flex items-center gap-2 bg-gold-400/10 border border-gold-400/25 text-gold-400 text-xs font-semibold px-5 py-2 rounded-full uppercase tracking-widest">
              ✓&nbsp;{totalChecks}-Point Yard Inspection
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mt-5 mb-3">What We Inspect</h2>
            <p className="text-white/40 text-sm max-w-xl mx-auto leading-relaxed">
              Each machine is inspected in-yard by our technical team before being listed.
              The wear rating (Excellent / Good / Wear Detected / Needs Repair) for each
              component is published on the listing page — no hidden surprises.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {INSPECTION_CATEGORIES.map(cat => (
              <div key={cat.title} className="border border-white/8 bg-navy-900 rounded-xl p-5 hover:border-white/15 transition-colors duration-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-white text-sm">{cat.title}</h3>
                  <span className="text-xs text-gold-400/70 font-medium bg-gold-400/8 px-2.5 py-0.5 rounded-full">
                    {cat.count} checks
                  </span>
                </div>
                <ul className="space-y-1.5">
                  {cat.checks.map(c => (
                    <li key={c} className="flex items-start gap-2.5 text-xs text-white/45">
                      <span className="text-gold-500 font-bold mt-0.5 flex-shrink-0">✓</span>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* ── TRANSACTION PROCESS ── */}
        <section>
          <div className="text-center mb-10">
            <p className="text-xs text-gold-400 font-semibold uppercase tracking-widest mb-3">Process</p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mb-3">How a Transaction Works</h2>
            <p className="text-white/40 text-sm max-w-lg mx-auto leading-relaxed">
              Every transaction follows a 6-phase process visible in your buyer dashboard.
            </p>
          </div>
          <div className="max-w-lg mx-auto space-y-0">
            {MILESTONES.map(({ phase, label, desc }, i) => (
              <div key={phase} className="flex gap-5">
                <div className="flex flex-col items-center">
                  <div className="w-9 h-9 rounded-full bg-gold-400/10 border border-gold-400/35 text-gold-400 flex items-center justify-center text-xs font-bold font-display flex-shrink-0">
                    {phase}
                  </div>
                  {i < MILESTONES.length - 1 && (
                    <div className="w-px flex-1 bg-gold-400/15 my-1 min-h-[28px]" />
                  )}
                </div>
                <div className="pb-7 pt-1">
                  <p className="font-semibold text-white text-sm">{label}</p>
                  <p className="text-xs text-white/35 mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── EXPORT DOCUMENTATION ── */}
        <section>
          <div className="text-center mb-10">
            <p className="text-xs text-gold-400 font-semibold uppercase tracking-widest mb-3">Documentation</p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mb-3">Export Documentation Package</h2>
            <p className="text-white/40 text-sm max-w-xl mx-auto leading-relaxed">
              Every transaction includes the full set of documents required for customs clearance
              at your destination port. All documents are stored in your private Document Vault.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {EXPORT_DOCS.map(({ doc, desc, phase }) => (
              <div key={doc} className="flex gap-4 p-5 border border-white/8 bg-navy-900 rounded-xl hover:border-white/15 transition-colors duration-200">
                <div className="flex-shrink-0 w-10 h-10 bg-gold-400/10 border border-gold-400/20 rounded-lg flex items-center justify-center text-gold-400 text-base">
                  &#x1F4C4;
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <p className="font-semibold text-white text-sm">{doc}</p>
                    <span className="text-xs text-gold-400 bg-gold-400/10 px-2 py-0.5 rounded-full">{phase}</span>
                  </div>
                  <p className="text-xs text-white/40 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── BUYER PROTECTION ── */}
        <section>
          <div className="text-center mb-10">
            <p className="text-xs text-gold-400 font-semibold uppercase tracking-widest mb-3">Protection</p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mb-3">Buyer Protection</h2>
            <p className="text-white/40 text-sm max-w-lg mx-auto">
              How we protect your investment throughout the transaction.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {BUYER_PROTECTION.map(({ title, body }) => (
              <div key={title} className="p-5 border border-white/8 bg-navy-900 rounded-xl hover:border-gold-400/25 transition-colors duration-200 group">
                <p className="font-semibold text-white text-sm mb-2 flex items-start gap-2.5">
                  <span className="text-gold-500 font-bold flex-shrink-0 mt-0.5">✓</span>
                  <span className="group-hover:text-gold-300 transition-colors duration-150">{title}</span>
                </p>
                <p className="text-xs text-white/35 leading-relaxed pl-5">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="relative bg-navy-900 border border-white/8 rounded-2xl px-8 py-14 text-center overflow-hidden">
          {/* Subtle corner accent */}
          <div className="absolute top-0 left-0 w-32 h-32 bg-gold-400/5 rounded-br-[100px]" />
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-gold-400/5 rounded-tl-[100px]" />

          <div className="relative z-10">
            <p className="text-xs text-gold-400 font-semibold uppercase tracking-widest mb-4">Start Your Search</p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mb-4">Ready to start?</h2>
            <p className="text-white/40 text-sm max-w-md mx-auto mb-8 leading-relaxed">
              Browse our current inventory, save machines to your watchlist,
              and request a quote when you&apos;re ready.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/machines"
                className="bg-gold-400 hover:bg-gold-300 text-navy-950 font-bold px-9 py-3.5 rounded text-sm transition-colors duration-150 shadow-xl shadow-black/30"
              >
                Browse Inventory
              </Link>
              <Link
                href="/auth/signup"
                className="border border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 text-white font-semibold px-9 py-3.5 rounded text-sm transition-all duration-150"
              >
                Apply for Access
              </Link>
            </div>
          </div>
        </section>

      </main>

      {/* ── FOOTER ── */}
      <footer className="bg-navy-950 border-t border-white/5 py-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <Link href="/">
              <Image src={logo} alt="BlueRock Equipment" className="h-9 w-auto object-contain invert opacity-90" />
            </Link>
            <p className="text-xs mt-2 text-white/20">Premium Direct-Sale Heavy Machinery</p>
          </div>
          <nav className="flex gap-6 text-xs text-white/30">
            <Link href="/" className="hover:text-white transition-colors duration-150">Home</Link>
            <Link href="/machines" className="hover:text-white transition-colors duration-150">Inventory</Link>
            <Link href="/auth/login" className="hover:text-white transition-colors duration-150">Sign In</Link>
          </nav>
        </div>
      </footer>

    </div>
  )
}
