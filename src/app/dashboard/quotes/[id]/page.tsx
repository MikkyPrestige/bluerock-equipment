import { createClient } from '@/lib/supabase/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import MilestoneTracker from '@/components/quote/MilestoneTracker'
import DocumentVault from '@/components/quote/DocumentVault'

const statusLabel: Record<string, string> = {
  pending_quote:     'Awaiting Quote',
  invoice_generated: 'Proforma Ready',
  buyer_accepted:    'Accepted',
  payment_pending:   'Payment Pending',
  payment_confirmed: 'Payment Confirmed',
  sold:              'Sold',
  cancelled:         'Cancelled',
}

const statusColors: Record<string, string> = {
  pending_quote:     'bg-amber-100 text-amber-800',
  invoice_generated: 'bg-blue-100 text-blue-800',
  buyer_accepted:    'bg-indigo-100 text-indigo-800',
  payment_pending:   'bg-orange-100 text-orange-800',
  payment_confirmed: 'bg-teal-100 text-teal-800',
  sold:              'bg-green-100 text-green-800',
  cancelled:         'bg-gray-100 text-gray-600',
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
    .eq('buyer_id', user.id) // enforce ownership
    .single()

  if (error || !quote) notFound()

  const { data: documents } = await adminSupabase
    .from('documents')
    .select('id, document_type, version, file_path, superseded_at, created_at')
    .eq('quote_id', id)
    .order('document_type')
    .order('version', { ascending: false })

  const m = quote.machines as {
    name: string; brand: string; model: string; year: number
    category: string; price_usd: number; yard_city: string; yard_country: string
  }
  const lockDate   = quote.lock_expires_at ? new Date(quote.lock_expires_at) : null
  const isExpired  = lockDate ? lockDate < new Date() : false
  const hoursLeft  = lockDate && !isExpired ? Math.ceil((lockDate.getTime() - Date.now()) / 3600000) : 0

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900">← Dashboard</Link>
          <h1 className="text-lg font-bold text-gray-900">Quote — PRF-{id.substring(0, 8).toUpperCase()}</h1>
          <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase ${statusColors[quote.status] || 'bg-gray-100 text-gray-600'}`}>
            {statusLabel[quote.status] ?? quote.status}
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">

        {/* Summary */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Equipment</h2>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xl font-bold text-gray-900">{m.name}</p>
              <p className="text-sm text-gray-500 mt-1">{m.year} · {m.category} · {m.yard_city}, {m.yard_country}</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-blue-700">
                {quote.total_amount
                  ? `$${Number(quote.total_amount).toLocaleString()}`
                  : `$${Number(m.price_usd).toLocaleString()} +freight`}
              </p>
              {quote.total_amount && (
                <p className="text-xs text-gray-400 mt-1">incl. freight & customs est.</p>
              )}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 rounded-md px-3 py-2">
              <p className="text-xs text-gray-400 mb-0.5">Port of Discharge</p>
              <p className="font-medium text-gray-900">{quote.port_of_discharge || '—'}</p>
            </div>
            <div className={`rounded-md px-3 py-2 ${isExpired ? 'bg-red-50' : 'bg-gray-50'}`}>
              <p className="text-xs text-gray-400 mb-0.5">48-Hour Price Lock</p>
              <p className={`font-medium ${isExpired ? 'text-red-600' : 'text-gray-900'}`}>
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
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-6">Transaction Progress</h2>
          <MilestoneTracker currentPhase={quote.milestone_phase ?? 0} />
        </div>

        {/* Document Vault */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Document Vault</h2>
          <p className="text-xs text-gray-400 mb-4">
            All documents are stored securely. Download links expire after 1 hour for security.
          </p>
          <DocumentVault documents={documents ?? []} />
        </div>

      </main>
    </div>
  )
}
