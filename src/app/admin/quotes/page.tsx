import { adminSupabase } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const statusColors: Record<string, string> = {
  pending_quote:      'bg-amber-100 text-amber-800',
  invoice_generated:  'bg-blue-100 text-blue-800',
  buyer_accepted:     'bg-indigo-100 text-indigo-800',
  payment_pending:    'bg-orange-100 text-orange-800',
  payment_confirmed:  'bg-teal-100 text-teal-800',
  sold:               'bg-green-100 text-green-800',
  cancelled:          'bg-gray-100 text-gray-600',
}

export default async function AdminQuotesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) redirect('/auth/login')

  const { data: quotes } = await adminSupabase
    .from('quotes')
    .select('*, machines(name, brand, model, price_usd), buyers(company_name, email)')
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h1 className="text-lg font-bold text-gray-900">Admin — Quotes</h1>
          <Link href="/admin/inventory" className="text-sm text-gray-500 hover:text-gray-900">Inventory</Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {!quotes || quotes.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-gray-400 text-sm">No quotes yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Quote ID</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Buyer</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Machine</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Total (USD)</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Lock Expires</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {quotes.map(q => {
                  const lockDate = q.lock_expires_at ? new Date(q.lock_expires_at) : null
                  const isExpired = lockDate ? lockDate < new Date() : false
                  return (
                    <tr key={q.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">
                        {q.id.substring(0, 8).toUpperCase()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{q.buyers?.company_name || '—'}</div>
                        <div className="text-xs text-gray-400">{q.buyers?.email}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {q.machines?.name || `${q.machines?.brand} ${q.machines?.model}`}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {q.total_amount
                          ? `$${Number(q.total_amount).toLocaleString()}`
                          : <span className="text-gray-400 text-xs">Not set</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase ${statusColors[q.status] || 'bg-gray-100 text-gray-600'}`}>
                          {q.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {lockDate
                          ? <span className={isExpired ? 'text-red-600' : ''}>
                              {lockDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              {isExpired ? ' (expired)' : ''}
                            </span>
                          : '—'
                        }
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/quotes/${q.id}`}
                          className="text-blue-700 hover:underline text-sm font-medium"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
