import Link from 'next/link'
import Image from 'next/image'
import logo from '@/assests/img/logo.jpg'

const STATS = [
  { value: '150-Point', label: 'Yard Inspection' },
  { value: '48-Hour',   label: 'Price Lock' },
  { value: '6-Phase',   label: 'Milestone Tracker' },
  { value: '100%',      label: 'Direct — No Brokers' },
]

const HOW_IT_WORKS = [
  { step: 1, title: 'Browse & Save',       body: 'Filter inventory by category, brand, and use case. Save machines to your watchlist.' },
  { step: 2, title: 'Request a Quote',     body: 'Submit a quote request with your port of discharge. Receive a proforma invoice within 24 hours.' },
  { step: 3, title: 'Review & Confirm',    body: 'Accept the proforma, confirm terms, and transfer payment via wire or letter of credit.' },
  { step: 4, title: 'Export & Delivery',   body: 'We handle the full export documentation package — B/L, export certificate, customs manifest, packing list.' },
]

const CATEGORIES = [
  'Excavators', 'Bulldozers', 'Wheel Loaders', 'Motor Graders',
  'Articulated Trucks', 'Compactors',
]

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>

      {/* Nav */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Image src={logo} alt="BlueRock Equipment" className="h-9 w-auto object-contain" />
            </Link>
            <span className="hidden sm:inline text-xs text-amber-700 font-medium uppercase tracking-wider">Premium Direct-Sale</span>
          </div>
          <nav className="flex items-center gap-4 sm:gap-6">
            <Link href="/machines" className="text-sm text-gray-600 hover:text-gray-900 hidden sm:block">Inventory</Link>
            <Link href="/trust" className="text-sm text-gray-600 hover:text-gray-900 hidden sm:block">Trust Hub</Link>
            <Link href="/auth/login" className="text-sm text-gray-600 hover:text-gray-900 hidden sm:block">Sign In</Link>
            <Link href="/machines" className="bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-md hover:bg-blue-800">
              Browse Inventory
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gray-900 text-white py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-amber-900/40 text-amber-400 text-xs font-semibold px-4 py-1.5 rounded-full mb-6 uppercase tracking-wider">
            ✓ 150-Point Inspected &nbsp;&middot;&nbsp; Direct Seller &nbsp;&middot;&nbsp; Export Ready
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-6">
            Premium Heavy Machinery,<br className="hidden sm:block" />
            <span className="text-amber-400"> Direct from the Yard</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-8 leading-relaxed">
            No brokers. No markups. Every machine is 150-point inspected, photographed, and
            ready to ship with a complete export documentation package.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/machines"
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-3 rounded-md text-base transition-colors"
            >
              Browse Inventory
            </Link>
            <Link
              href="/trust"
              className="bg-white/10 hover:bg-white/20 text-white font-semibold px-8 py-3 rounded-md text-base transition-colors"
            >
              How It Works
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-blue-700 py-6 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4">
          {STATS.map(({ value, label }) => (
            <div key={label} className="text-center">
              <p className="text-xl sm:text-2xl font-bold text-white">{value}</p>
              <p className="text-xs text-blue-200 mt-0.5 uppercase tracking-wide">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Equipment Categories */}
      <section className="py-16 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Equipment We Carry</h2>
          <p className="text-sm text-gray-500 text-center mb-8">Available for immediate export to West Africa, Middle East, Southeast Asia, and Americas</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {CATEGORIES.map(cat => (
              <Link
                key={cat}
                href={`/machines?category=${encodeURIComponent(cat.replace(/s$/, ''))}`}
                className="bg-white border border-gray-200 hover:border-blue-400 hover:shadow-sm rounded-lg px-5 py-4 text-center transition-all"
              >
                <p className="font-semibold text-gray-800 text-sm">{cat}</p>
              </Link>
            ))}
          </div>
          <div className="text-center mt-6">
            <Link href="/machines" className="text-sm text-blue-700 font-medium hover:underline">
              View all available machines →
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">How a Transaction Works</h2>
          <p className="text-sm text-gray-500 text-center mb-10">From quote request to delivery — fully documented, 6-phase milestone tracker</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {HOW_IT_WORKS.map(({ step, title, body }) => (
              <div key={step} className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-700 text-white flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                  {step}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 mb-1">{title}</p>
                  <p className="text-sm text-gray-500 leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link href="/trust" className="text-sm text-blue-700 font-medium hover:underline">
              Full Trust & Verification Hub →
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 bg-gray-900 text-white">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-3">Ready to find your machine?</h2>
          <p className="text-gray-400 mb-6 text-sm">
            Sign up to request quotes, track shipments, and access your Document Vault.
            Max 10 verified buyers — currently accepting applications.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/auth/signup" className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-3 rounded-md text-sm">
              Apply for Access
            </Link>
            <Link href="/machines" className="bg-white/10 hover:bg-white/20 text-white font-semibold px-8 py-3 rounded-md text-sm">
              Browse First
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-950 text-gray-500 py-8 px-6">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <Link href="/">
              <Image src={logo} alt="BlueRock Equipment" className="h-10 w-auto object-contain invert opacity-90" />
            </Link>
            <p className="text-xs mt-1 text-gray-500">Premium Direct-Sale Heavy Machinery</p>
          </div>
          <nav className="flex gap-5 text-xs">
            <Link href="/machines" className="hover:text-white">Inventory</Link>
            <Link href="/trust" className="hover:text-white">Trust Hub</Link>
            <Link href="/auth/login" className="hover:text-white">Buyer Login</Link>
            <Link href="/auth/signup" className="hover:text-white">Apply</Link>
          </nav>
        </div>
      </footer>

    </div>
  )
}
