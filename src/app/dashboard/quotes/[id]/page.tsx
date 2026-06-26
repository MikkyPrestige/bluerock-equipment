import { createClient } from '@/lib/supabase/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import MilestoneTracker from '@/components/quote/MilestoneTracker'
import DocumentVault    from '@/components/quote/DocumentVault'
import logo             from '@/assests/img/logo.jpg'

const STATUS: Record<string, { label: string; badge: string }> = {
  pending_quote:     { label: 'Awaiting Quote',   badge: 'bg-amber-500/20 border-amber-500/30 text-amber-400' },
  invoice_generated: { label: 'Proforma Ready',   badge: 'bg-blue-500/20 border-blue-500/30 text-blue-400' },
  buyer_accepted:    { label: 'Accepted',          badge: 'bg-indigo-500/20 border-indigo-500/30 text-indigo-400' },
  payment_pending:   { label: 'Payment Pending',   badge: 'bg-orange-500/20 border-orange-500/30 text-orange-400' },
  payment_confirmed: { label: 'Payment Confirmed', badge: 'bg-teal-500/20 border-teal-500/30 text-teal-400' },
  sold:              { label: 'Sold',              badge: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' },
  cancelled:         { label: 'Cancelled',         badge: 'bg-white/8 border-white/12 text-white/30' },
}

export default async function BuyerQuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { id } = await params

  const { data: quote, error } = await adminSupabase
    .from('quotes')
    .select('*, machines(name, brand, model, year, category, price_usd, yard_city, yard_country), buyers(company_name)')
    .eq('id', id)
    .eq('buyer_id', user.id)
    .single()

  if (error || !quote) notFound()

  const DOC_PAGE_SIZE = 10

  const [{ data: documents }, { count: totalDocCount }] = await Promise.all([
    adminSupabase
      .from('documents')
      .select('id, document_type, version, file_path, superseded_at, created_at')
      .eq('quote_id', id)
      .order('document_type')
      .order('version', { ascending: false })
      .range(0, DOC_PAGE_SIZE - 1),
    adminSupabase
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('quote_id', id),
  ])

  const m = quote.machines as {
    name: string; brand: string; model: string; year: number
    category: string; price_usd: number; yard_city: string; yard_country: string
  }
  const machineName = m.name || `${m.brand} ${m.model}`

  const lockDate  = quote.lock_expires_at ? new Date(quote.lock_expires_at) : null
  const isExpired = lockDate ? lockDate < new Date() : false
  const hoursLeft = lockDate && !isExpired ? Math.ceil((lockDate.getTime() - Date.now()) / 3600000) : 0

  const status = STATUS[quote.status] ?? { label: quote.status, badge: 'bg-white/8 border-white/12 text-white/40' }

  const displayPrice = quote.total_amount
    ? `$${Number(quote.total_amount).toLocaleString()}`
    : `$${Number(m.price_usd).toLocaleString()} + freight`

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col">

      {/* ── NAV ── */}
      <header className="sticky top-0 z-50 bg-navy-950/96 backdrop-blur-md border-b border-white/8 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link href="/">
            <Image src={logo} alt="BlueRock Equipment" className="h-9 w-auto object-contain invert opacity-90" />
          </Link>
          <div className="hidden sm:flex items-center gap-2 text-sm text-white/30">
            <Link href="/dashboard" className="hover:text-white transition-colors duration-150">← Dashboard</Link>
            <span>/</span>
            <span className="text-white/50">PRF-{id.slice(0, 8).toUpperCase()}</span>
          </div>
        </div>
        <Link href="/dashboard" className="text-sm text-white/35 hover:text-white sm:hidden transition-colors">
          ← Back
        </Link>
      </header>

      {/* ── PAGE TITLE ── */}
      <div className="bg-navy-900 border-b border-white/8 px-6 py-5">
        <div className="max-w-3xl mx-auto flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs text-gold-400 font-semibold uppercase tracking-widest mb-1.5">Quote Reference</p>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-xl sm:text-2xl font-bold text-white">
                PRF-{id.slice(0, 8).toUpperCase()}
              </h1>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wide ${status.badge}`}>
                {status.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col gap-5">

        {/* Equipment summary */}
        <div className="bg-navy-900 border border-white/8 rounded-2xl p-5 sm:p-6">
          <p className="text-xs font-bold text-white/35 uppercase tracking-widest mb-4">Equipment</p>

          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-white leading-tight">{machineName}</h2>
              <p className="text-white/40 text-sm mt-1.5">
                {m.year} · {m.category} · {m.yard_city}, {m.yard_country}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-display text-2xl font-bold text-gold-400">{displayPrice}</p>
              {quote.total_amount && (
                <p className="text-white/25 text-xs mt-1">incl. freight & customs est.</p>
              )}
            </div>
          </div>

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-navy-950/50 border border-white/6 rounded-xl px-4 py-3">
              <p className="text-white/30 text-[10px] uppercase tracking-wider mb-1">Port of Discharge</p>
              <p className="text-white text-sm font-semibold">{quote.port_of_discharge || '—'}</p>
            </div>
            <div className={`border rounded-xl px-4 py-3 ${
              isExpired
                ? 'bg-red-500/8 border-red-500/20'
                : hoursLeft <= 12 && hoursLeft > 0
                  ? 'bg-orange-500/8 border-orange-500/20'
                  : 'bg-navy-950/50 border-white/6'
            }`}>
              <p className="text-white/30 text-[10px] uppercase tracking-wider mb-1">48-Hour Price Lock</p>
              <p className={`text-sm font-semibold ${
                isExpired ? 'text-red-400' :
                hoursLeft <= 6  ? 'text-red-400' :
                hoursLeft <= 12 ? 'text-orange-400' :
                hoursLeft <= 24 ? 'text-amber-400' :
                                  'text-emerald-400'
              }`}>
                {isExpired
                  ? 'Expired'
                  : hoursLeft > 0
                    ? `${hoursLeft}h remaining`
                    : lockDate?.toLocaleDateString('en-US', { dateStyle: 'medium' }) ?? '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Milestone Tracker */}
        <div className="bg-navy-900 border border-white/8 rounded-2xl p-5 sm:p-6">
          <p className="text-xs font-bold text-white/35 uppercase tracking-widest mb-6">Transaction Progress</p>
          <MilestoneTracker currentPhase={quote.milestone_phase ?? 0} />
        </div>

        {/* Document Vault */}
        <div className="bg-navy-900 border border-white/8 rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold text-white/35 uppercase tracking-widest">Document Vault</p>
            {documents && documents.length > 0 && (
              <span className="text-[10px] text-gold-400 bg-gold-400/12 border border-gold-400/20 px-2.5 py-0.5 rounded-full font-semibold">
                {documents.filter(d => !d.superseded_at).length} active
              </span>
            )}
          </div>
          <p className="text-[11px] text-white/25 mb-4 leading-relaxed">
            Download links expire after 1 hour for security. Regenerate if needed.
          </p>
          <DocumentVault
            quoteId={id}
            initialDocuments={documents ?? []}
            totalCount={totalDocCount ?? 0}
            pageSize={DOC_PAGE_SIZE}
          />
        </div>

      </main>

      {/* ── FOOTER ── */}
      <footer className="bg-navy-950 border-t border-white/5 py-8 px-6 mt-auto">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/">
            <Image src={logo} alt="BlueRock Equipment" className="h-8 w-auto object-contain invert opacity-75" />
          </Link>
          <nav className="flex gap-5 text-xs text-white/30">
            <Link href="/dashboard" className="hover:text-white transition-colors duration-150">Dashboard</Link>
            <Link href="/machines"  className="hover:text-white transition-colors duration-150">Inventory</Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
