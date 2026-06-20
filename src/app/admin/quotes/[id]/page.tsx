import { adminSupabase } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import QuoteBuilderForm from '@/components/admin/QuoteBuilderForm'
import GenerateProformaButton from '@/components/admin/GenerateProformaButton'
import MilestoneTracker from '@/components/quote/MilestoneTracker'
import MilestoneSwitchboard from '@/components/admin/MilestoneSwitchboard'
import DocumentVault from '@/components/quote/DocumentVault'
import DocumentLedger from '@/components/admin/DocumentLedger'

const statusColors: Record<string, string> = {
  pending_quote:      'bg-amber-100 text-amber-800',
  invoice_generated:  'bg-blue-100 text-blue-800',
  buyer_accepted:     'bg-indigo-100 text-indigo-800',
  payment_pending:    'bg-orange-100 text-orange-800',
  payment_confirmed:  'bg-teal-100 text-teal-800',
  sold:               'bg-green-100 text-green-800',
  cancelled:          'bg-gray-100 text-gray-600',
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

  const { data: quote, error } = await adminSupabase
    .from('quotes')
    .select('*, machines(*), buyers(*)')
    .eq('id', id)
    .single()

  const { data: documents } = await adminSupabase
    .from('documents')
    .select('id, document_type, version, file_path, superseded_at, created_at')
    .eq('quote_id', id)
    .order('document_type')
    .order('version', { ascending: false })

  if (error || !quote) notFound()

  const m = quote.machines
  const b = quote.buyers
  const lockDate = quote.lock_expires_at ? new Date(quote.lock_expires_at) : null
  const isExpired = lockDate ? lockDate < new Date() : false

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/quotes" className="text-sm text-gray-500 hover:text-gray-900">← Quotes</Link>
          <h1 className="text-lg font-bold text-gray-900">
            Quote — PRF-{id.substring(0, 8).toUpperCase()}
          </h1>
          <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase ${statusColors[quote.status] || 'bg-gray-100 text-gray-600'}`}>
            {quote.status.replace(/_/g, ' ')}
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* Machine */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Machine</h2>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xl font-bold text-gray-900">{m.name}</p>
              <p className="text-sm text-gray-500 mt-1">{m.year} · {m.category} · {m.yard_city}, {m.yard_country}</p>
            </div>
            <p className="text-xl font-bold text-blue-700">${Number(m.price_usd).toLocaleString()}</p>
          </div>
          <div className="mt-3 flex gap-2">
            <Link href={`/machines/${m.id}`} className="text-xs text-blue-700 hover:underline">View listing</Link>
          </div>
        </div>

        {/* Buyer */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Buyer</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Company</p>
              <p className="font-medium text-gray-900">{b.company_name || '—'}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Email</p>
              <p className="font-medium text-gray-900">{b.email}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Port of Discharge</p>
              <p className="font-medium text-gray-900">{quote.port_of_discharge || b.preferred_port_of_discharge || '—'}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Tier</p>
              <p className="font-medium text-gray-900 capitalize">{b.tier || 'observer'}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">48-Hour Lock</p>
              <p className={`font-medium ${isExpired ? 'text-red-600' : 'text-gray-900'}`}>
                {lockDate
                  ? lockDate.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) + (isExpired ? ' (expired)' : '')
                  : '—'}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Requested</p>
              <p className="font-medium text-gray-900">
                {new Date(quote.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            </div>
          </div>
        </div>

        {/* Quote Builder */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Quote Builder — Set Pricing</h2>
          <QuoteBuilderForm
            quoteId={id}
            initialFreight={quote.freight_estimate}
            initialCustoms={quote.customs_fee}
            initialTotal={quote.total_amount}
            machinePrice={Number(m.price_usd)}
          />
        </div>

        {/* Proforma Invoice */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Proforma Invoice</h2>
          {quote.proforma_invoice_url && (
            <p className="text-xs text-gray-400 mb-3">Current: {quote.proforma_invoice_url}</p>
          )}
          <p className="text-sm text-gray-500 mb-4">
            Save pricing above before generating. The PDF is stored in the buyer&apos;s Document Vault.
          </p>
          <GenerateProformaButton
            quoteId={id}
            hasProforma={!!quote.proforma_invoice_url}
          />
        </div>

        {/* Milestone Tracker */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-6">Transaction Progress</h2>
          <MilestoneTracker currentPhase={quote.milestone_phase ?? 0} />
        </div>

        {/* Milestone Switchboard */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Milestone Switchboard</h2>
          <MilestoneSwitchboard quoteId={id} currentPhase={quote.milestone_phase ?? 0} />
        </div>

        {/* Document Vault */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Document Vault</h2>
          <DocumentVault documents={documents ?? []} />
        </div>

        {/* Document Ledger — Upload Trade Docs */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Upload Trade Document</h2>
          <p className="text-sm text-gray-500 mb-4">
            Upload signed B/L, export certificate, customs manifest or packing list. Previous versions are automatically superseded.
          </p>
          <DocumentLedger quoteId={id} />
        </div>

      </main>
    </div>
  )
}
