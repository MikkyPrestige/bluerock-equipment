import { adminSupabase } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import logo               from '@/assests/img/logo.jpg'
import QuoteBuilderForm   from '@/components/admin/QuoteBuilderForm'
import GenerateProformaButton from '@/components/admin/GenerateProformaButton'
import MilestoneTracker   from '@/components/quote/MilestoneTracker'
import MilestoneSwitchboard from '@/components/admin/MilestoneSwitchboard'
import DocumentVault      from '@/components/quote/DocumentVault'
import DocumentLedger     from '@/components/admin/DocumentLedger'

/* ── Status badge map ── */
const STATUS: Record<string, { label: string; badge: string }> = {
  pending_quote:     { label: 'Pending Quote',     badge: 'bg-amber-500/20 border-amber-500/30 text-amber-400' },
  invoice_generated: { label: 'Invoice Generated', badge: 'bg-blue-500/20 border-blue-500/30 text-blue-400' },
  buyer_accepted:    { label: 'Buyer Accepted',    badge: 'bg-blue-500/20 border-blue-500/30 text-blue-400' },
  payment_pending:   { label: 'Payment Pending',   badge: 'bg-orange-500/20 border-orange-500/30 text-orange-400' },
  payment_confirmed: { label: 'Payment Confirmed', badge: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' },
  sold:              { label: 'Sold',              badge: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' },
  cancelled:         { label: 'Cancelled',         badge: 'bg-white/8 border-white/12 text-white/30' },
}

/* ── Tier badge ── */
const TIER_BADGE: Record<string, string> = {
  gold:     'bg-gold-400/20 border-gold-400/40 text-gold-400',
  silver:   'bg-slate-300/20 border-slate-300/30 text-slate-300',
  observer: 'bg-white/8 border-white/12 text-white/35',
}

/* ── Admin tab nav ── */
const TABS = [
  { label: 'Inventory',    href: '/admin/inventory' },
  { label: 'Quotes',       href: '/admin/quotes' },
  { label: 'Buyers',       href: '/admin/buyers' },
  { label: 'Walkthroughs', href: '/admin/walkthroughs' },
  { label: 'Freight',      href: '/admin/freight-rates' },
]

/* ── Section card shell ── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-navy-900 border border-white/8 rounded-2xl p-5 sm:p-6">
      <h2 className="font-display text-base font-bold text-gold-400 pb-4 border-b border-white/8 mb-5">
        {title}
      </h2>
      {children}
    </div>
  )
}

/* ── Info cell inside buyer grid ── */
function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1.5">{label}</p>
      <div className="text-white text-sm font-medium">{children}</div>
    </div>
  )
}

export default async function AdminQuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) redirect('/auth/login')

  const { id } = await params

  const [{ data: quote, error }, { data: documents }] = await Promise.all([
    adminSupabase
      .from('quotes')
      .select('*, machines(*), buyers(*)')
      .eq('id', id)
      .single(),
    adminSupabase
      .from('documents')
      .select('id, document_type, version, file_path, superseded_at, created_at')
      .eq('quote_id', id)
      .order('document_type')
      .order('version', { ascending: false }),
  ])

  if (error || !quote) notFound()

  const m = quote.machines as Record<string, unknown>
  const b = quote.buyers   as Record<string, unknown>

  const machineName = (m.name as string) || `${m.brand} ${m.model}`
  const statusInfo  = STATUS[quote.status] ?? { label: quote.status.replace(/_/g, ' '), badge: 'bg-white/8 border-white/12 text-white/40' }
  const tierBadge   = TIER_BADGE[(b.tier as string) ?? 'observer'] ?? TIER_BADGE.observer

  const lockDate  = quote.lock_expires_at ? new Date(quote.lock_expires_at) : null
  const isExpired = lockDate ? lockDate < new Date() : false
  const hoursLeft = lockDate && !isExpired ? (lockDate.getTime() - Date.now()) / 3600000 : null

  const lockColorClass = isExpired
    ? 'text-red-400'
    : hoursLeft !== null && hoursLeft <= 6
      ? 'text-red-400'
      : hoursLeft !== null && hoursLeft <= 24
        ? 'text-gold-400'
        : 'text-white'

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
            <div className="hidden sm:flex items-center gap-2 text-sm text-white/30">
              <Link href="/admin/quotes" className="hover:text-gold-400 transition-colors duration-150">← Quotes</Link>
              <span>/</span>
              <span className="text-white/55 font-mono">PRF-{id.slice(0, 8).toUpperCase()}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin/quotes" className="text-xs text-gold-400 hover:text-gold-300 sm:hidden transition-colors">
              ← Quotes
            </Link>
            <Link href="/admin" className="text-xs text-white/35 hover:text-white/65 transition-colors hidden sm:inline">
              Dashboard
            </Link>
          </div>
        </div>

        {/* Tab bar */}
        <div className="px-6 overflow-x-auto scrollbar-hide">
          <div className="flex items-center min-w-max border-t border-white/6">
            {TABS.map(tab => {
              const isActive = tab.href === '/admin/quotes'
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

      {/* ── TITLE BAR ── */}
      <div className="bg-navy-900 border-b border-white/8 px-6 py-5">
        <div className="max-w-4xl mx-auto flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs text-gold-400 font-semibold uppercase tracking-widest mb-2">Admin · Quote Detail</p>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-display text-xl sm:text-2xl font-bold text-white">
                PRF-{id.slice(0, 8).toUpperCase()}
              </h1>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wide ${statusInfo.badge}`}>
                {statusInfo.label}
              </span>
            </div>
          </div>
          <p className="text-white/25 text-xs">
            Requested {new Date(quote.created_at).toLocaleDateString('en-US', { dateStyle: 'medium' })}
          </p>
        </div>
      </div>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col gap-5">

        {/* ── MACHINE ── */}
        <Section title="Machine">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <Link href={`/machines/${m.id}`} target="_blank" className="group">
                <h3 className="font-display text-xl font-bold text-white group-hover:text-gold-300 transition-colors duration-150 leading-tight">
                  {machineName}
                </h3>
              </Link>
              <p className="text-white/40 text-sm mt-1.5">
                {String(m.year)} · {String(m.category)} · {String(m.yard_city)}, {String(m.yard_country)}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-white/30 text-[10px] uppercase tracking-wider mb-1">Machine Price</p>
              <p className="font-display text-2xl font-bold text-gold-400">
                ${Number(m.price_usd).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-white/6">
            <Link
              href={`/machines/${m.id}`}
              target="_blank"
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors duration-150"
            >
              View public listing ↗
            </Link>
          </div>
        </Section>

        {/* ── BUYER ── */}
        <Section title="Buyer">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
            <Cell label="Company">
              <span className="font-semibold">{String(b.company_name || '—')}</span>
            </Cell>
            <Cell label="Email">
              <span className="text-white/65 font-normal text-xs break-all">{String(b.email)}</span>
            </Cell>
            <Cell label="Tier">
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wide ${tierBadge}`}>
                {String(b.tier || 'observer')}
              </span>
            </Cell>
            <Cell label="Port of Discharge">
              {String(quote.port_of_discharge || b.preferred_port_of_discharge || '—')}
            </Cell>
            <Cell label="48-Hour Lock">
              <span className={lockColorClass}>
                {lockDate
                  ? lockDate.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : '—'}
                {isExpired && <span className="ml-1 text-[10px] text-red-400">(expired)</span>}
                {hoursLeft !== null && !isExpired && hoursLeft <= 24 && (
                  <span className="ml-1 text-[10px]">({Math.ceil(hoursLeft)}h left)</span>
                )}
              </span>
            </Cell>
            <Cell label="Requested">
              <span className="text-white/65 font-normal">
                {new Date(quote.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
            </Cell>
          </div>
        </Section>

        {/* ── QUOTE BUILDER ── */}
        <Section title="Quote Builder — Set Pricing">
          <QuoteBuilderForm
            quoteId={id}
            initialFreight={quote.freight_estimate}
            initialCustoms={quote.customs_fee}
            initialTotal={quote.total_amount}
            machinePrice={Number(m.price_usd)}
          />
        </Section>

        {/* ── PROFORMA INVOICE ── */}
        <Section title="Proforma Invoice">
          {quote.proforma_invoice_url && (
            <p className="text-[11px] text-white/30 font-mono mb-3 break-all">
              Current: {quote.proforma_invoice_url}
            </p>
          )}
          <p className="text-white/35 text-xs mb-4 leading-relaxed">
            Save pricing above before generating. The PDF is stored securely in the buyer&apos;s Document Vault.
          </p>
          <GenerateProformaButton quoteId={id} hasProforma={!!quote.proforma_invoice_url} />
        </Section>

        {/* ── TRANSACTION PROGRESS ── */}
        <Section title="Transaction Progress">
          <MilestoneTracker currentPhase={quote.milestone_phase ?? 0} />
        </Section>

        {/* ── MILESTONE SWITCHBOARD ── */}
        <Section title="Milestone Switchboard">
          <MilestoneSwitchboard quoteId={id} currentPhase={quote.milestone_phase ?? 0} />
        </Section>

        {/* ── DOCUMENT VAULT ── */}
        <Section title="Document Vault">
          <div className="flex items-center justify-between mb-4">
            <p className="text-white/30 text-xs">Buyer-accessible documents for this transaction.</p>
            {documents && documents.filter(d => !d.superseded_at).length > 0 && (
              <span className="text-[10px] text-gold-400 bg-gold-400/12 border border-gold-400/20 px-2.5 py-0.5 rounded-full font-semibold">
                {documents.filter(d => !d.superseded_at).length} active
              </span>
            )}
          </div>
          <DocumentVault
            quoteId={id}
            initialDocuments={documents ?? []}
            totalCount={documents?.length ?? 0}
            pageSize={100}
          />
        </Section>

        {/* ── UPLOAD TRADE DOCUMENT ── */}
        <Section title="Upload Trade Document">
          <p className="text-white/30 text-xs mb-5 leading-relaxed">
            Upload signed B/L, export certificate, customs manifest, or packing list.
            Previous versions are automatically superseded.
          </p>
          <DocumentLedger quoteId={id} />
        </Section>

      </main>

      {/* ── FOOTER ── */}
      <footer className="bg-navy-950 border-t border-white/5 py-6 px-6 mt-auto">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <p className="text-xs text-white/20">BlueRock Equipment — Admin Operations</p>
          <Link href="/admin/quotes" className="text-xs text-white/25 hover:text-white/50 transition-colors duration-150">
            ← All Quotes
          </Link>
        </div>
      </footer>
    </div>
  )
}
