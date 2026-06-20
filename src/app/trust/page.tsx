import type { Metadata } from 'next'
import Link from 'next/link'

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
  {
    doc: 'Proforma Invoice',
    desc: 'Itemised price breakdown with freight estimate, valid for 48 hours with price lock.',
    phase: 'Phase 1',
  },
  {
    doc: 'Bill of Lading',
    desc: 'Title transfer document issued by shipping line upon loading at port of origin.',
    phase: 'Phase 4',
  },
  {
    doc: 'Export Certificate',
    desc: 'Government-issued certificate confirming the equipment is legally cleared for export.',
    phase: 'Phase 4',
  },
  {
    doc: 'Packing List',
    desc: 'Detailed list of all items shipped, required for customs clearance at destination port.',
    phase: 'Phase 4',
  },
  {
    doc: 'Customs Manifest',
    desc: 'Formal declaration of goods for origin customs — required for international shipment.',
    phase: 'Phase 4',
  },
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

export default function TrustPage() {
  const totalChecks = INSPECTION_CATEGORIES.reduce((s, c) => s + c.count, 0)

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>

      {/* Nav */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-lg font-bold text-gray-900">BlueRock Equipment</Link>
          <nav className="flex items-center gap-4 sm:gap-6">
            <Link href="/machines" className="text-sm text-gray-600 hover:text-gray-900 hidden sm:block">Inventory</Link>
            <Link href="/auth/login" className="text-sm text-gray-600 hover:text-gray-900 hidden sm:block">Sign In</Link>
            <Link href="/machines" className="bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-md hover:bg-blue-800">
              Browse Inventory
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gray-900 text-white py-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs text-amber-400 font-semibold uppercase tracking-widest mb-3">Trust & Verification Hub</p>
          <h1 className="text-3xl sm:text-4xl font-bold mb-4">Built for Buyers Who Do Their Due Diligence</h1>
          <p className="text-gray-400 text-base max-w-xl mx-auto leading-relaxed">
            Every machine we list has passed a {totalChecks}-point yard inspection, been photographed in
            the yard, and is backed by a complete export documentation package.
          </p>
        </div>
      </section>

      <main className="max-w-5xl mx-auto px-6 py-16 space-y-20">

        {/* 150-Point Inspection */}
        <section>
          <div className="text-center mb-10">
            <span className="inline-flex items-center gap-2 bg-green-50 text-green-700 text-xs font-semibold px-4 py-1.5 rounded-full uppercase tracking-wide">
              ✓ {totalChecks}-Point Yard Inspection
            </span>
            <h2 className="text-2xl font-bold text-gray-900 mt-4 mb-2">What We Inspect</h2>
            <p className="text-sm text-gray-500 max-w-xl mx-auto">
              Each machine is inspected in-yard by our technical team before being listed.
              The wear rating (Excellent / Good / Wear Detected / Needs Repair) for each
              component is published on the listing page — no hidden surprises.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {INSPECTION_CATEGORIES.map(cat => (
              <div key={cat.title} className="border border-gray-200 rounded-lg p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 text-sm">{cat.title}</h3>
                  <span className="text-xs text-gray-400 font-medium">{cat.count} checks</span>
                </div>
                <ul className="space-y-1">
                  {cat.checks.map(c => (
                    <li key={c} className="flex items-start gap-2 text-xs text-gray-600">
                      <span className="text-green-600 font-bold mt-0.5 flex-shrink-0">✓</span>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Transaction Process */}
        <section>
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">How a Transaction Works</h2>
            <p className="text-sm text-gray-500">
              Every transaction follows a 6-phase process visible in your buyer dashboard.
            </p>
          </div>
          <div className="relative">
            <div className="space-y-0">
              {MILESTONES.map(({ phase, label, desc }, i) => (
                <div key={phase} className="flex gap-5">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-blue-700 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {phase}
                    </div>
                    {i < MILESTONES.length - 1 && (
                      <div className="w-0.5 flex-1 bg-blue-200 my-1 min-h-[24px]" />
                    )}
                  </div>
                  <div className="pb-6">
                    <p className="font-semibold text-gray-900 text-sm">{label}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Export Documentation */}
        <section>
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Export Documentation Package</h2>
            <p className="text-sm text-gray-500 max-w-xl mx-auto">
              Every transaction includes the full set of documents required for customs clearance
              at your destination port. All documents are stored in your private Document Vault.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {EXPORT_DOCS.map(({ doc, desc, phase }) => (
              <div key={doc} className="flex gap-4 p-5 border border-gray-200 rounded-lg">
                <div className="flex-shrink-0">
                  <span className="block w-10 h-10 bg-blue-50 text-blue-700 rounded-lg flex items-center justify-center text-lg font-bold">
                    &#x1F4C4;
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-gray-900 text-sm">{doc}</p>
                    <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{phase}</span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Buyer Protection */}
        <section>
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Buyer Protection</h2>
            <p className="text-sm text-gray-500">How we protect your investment throughout the transaction.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[
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
            ].map(({ title, body }) => (
              <div key={title} className="p-5 border border-gray-200 rounded-lg">
                <p className="font-semibold text-gray-900 text-sm mb-2 flex items-start gap-2">
                  <span className="text-green-600 font-bold flex-shrink-0">✓</span>
                  {title}
                </p>
                <p className="text-xs text-gray-500 leading-relaxed pl-5">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="bg-gray-900 text-white rounded-xl px-8 py-12 text-center">
          <h2 className="text-2xl font-bold mb-3">Ready to start?</h2>
          <p className="text-gray-400 text-sm max-w-md mx-auto mb-6">
            Browse our current inventory, save machines to your watchlist,
            and request a quote when you&apos;re ready.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/machines" className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-3 rounded-md text-sm">
              Browse Inventory
            </Link>
            <Link href="/auth/signup" className="bg-white/10 hover:bg-white/20 text-white font-semibold px-8 py-3 rounded-md text-sm">
              Apply for Access
            </Link>
          </div>
        </section>

      </main>

      <footer className="bg-gray-950 text-gray-500 py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-white font-semibold text-sm">BlueRock Equipment &mdash; Premium Direct-Sale Heavy Machinery</p>
          <nav className="flex gap-5 text-xs">
            <Link href="/" className="hover:text-white">Home</Link>
            <Link href="/machines" className="hover:text-white">Inventory</Link>
            <Link href="/auth/login" className="hover:text-white">Sign In</Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
