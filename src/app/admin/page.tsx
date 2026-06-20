import { adminSupabase } from '@/lib/supabase/admin'
import Link from 'next/link'

const NAV = [
  {
    href: '/admin/inventory',
    label: 'Inventory',
    desc: 'Add machines, generate inspection reports, manage listings',
    action: '+ Add Machine',
    actionHref: '/admin/inventory/new',
  },
  {
    href: '/admin/quotes',
    label: 'Quotes',
    desc: 'Review quote requests, set pricing, generate proforma invoices',
    action: null,
    actionHref: null,
  },
  {
    href: '/admin/buyers',
    label: 'Buyers',
    desc: 'Manage buyer tiers, KYC verification, and arrival alerts',
    action: null,
    actionHref: null,
  },
  {
    href: '/admin/walkthroughs',
    label: 'Walkthroughs',
    desc: 'Log Calendly bookings, assign technicians, add post-call notes',
    action: null,
    actionHref: null,
  },
  {
    href: '/admin/freight-rates',
    label: 'Freight Rates',
    desc: 'Edit destination port base costs — refresh monthly with shipping partners',
    action: null,
    actionHref: null,
  },
]

export default async function AdminDashboardPage() {
  const [
    { count: machineCount },
    { count: quoteCount },
    { count: buyerCount },
    { data: recentQuotes },
  ] = await Promise.all([
    adminSupabase.from('machines').select('*', { count: 'exact', head: true }).neq('status', 'sold'),
    adminSupabase.from('quotes').select('*', { count: 'exact', head: true }).eq('status', 'pending_quote'),
    adminSupabase.from('buyers').select('*', { count: 'exact', head: true }),
    adminSupabase
      .from('quotes')
      .select('id, status, created_at, machines(name, brand, model), buyers(company_name, email)')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const statusColors: Record<string, string> = {
    pending_quote:     'bg-amber-100 text-amber-800',
    invoice_generated: 'bg-blue-100 text-blue-800',
    buyer_accepted:    'bg-indigo-100 text-indigo-800',
    payment_pending:   'bg-orange-100 text-orange-800',
    payment_confirmed: 'bg-teal-100 text-teal-800',
    sold:              'bg-green-100 text-green-800',
    cancelled:         'bg-gray-100 text-gray-600',
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">BlueRock Admin</h1>
          <p className="text-xs text-gray-400 mt-0.5">Operations Dashboard</p>
        </div>
        <Link href="/machines" className="text-sm text-gray-500 hover:text-gray-900">
          View Public Site →
        </Link>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Active Machines</p>
            <p className="text-3xl font-bold text-gray-900">{machineCount ?? 0}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Pending Quotes</p>
            <p className="text-3xl font-bold text-amber-600">{quoteCount ?? 0}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Registered Buyers</p>
            <p className="text-3xl font-bold text-gray-900">{buyerCount ?? 0}</p>
            <p className="text-xs text-gray-400 mt-1">of 10 max</p>
          </div>
        </div>

        {/* Quick Nav */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Admin Sections</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {NAV.map(({ href, label, desc, action, actionHref }) => (
              <div key={href} className="bg-white rounded-lg border border-gray-200 p-5 flex flex-col">
                <Link href={href} className="font-bold text-gray-900 text-base hover:text-blue-700 hover:underline">
                  {label}
                </Link>
                <p className="text-xs text-gray-500 mt-1 flex-1">{desc}</p>
                <div className="mt-4 flex gap-3">
                  <Link href={href} className="text-xs text-blue-700 font-medium hover:underline">
                    Open →
                  </Link>
                  {action && actionHref && (
                    <Link href={actionHref} className="text-xs text-gray-500 hover:underline">
                      {action}
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Quotes */}
        {recentQuotes && recentQuotes.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Recent Quotes</h2>
              <Link href="/admin/quotes" className="text-xs text-blue-700 hover:underline">View all →</Link>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Quote</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Buyer</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Machine</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {recentQuotes.map(q => {
                      const m = q.machines as unknown as { name?: string; brand: string; model: string } | null
                      const b = q.buyers as unknown as { company_name: string | null; email: string } | null
                      return (
                        <tr key={q.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono text-xs text-gray-500">
                            {q.id.substring(0, 8).toUpperCase()}
                          </td>
                          <td className="px-4 py-3 text-gray-700">{b?.company_name || b?.email || '—'}</td>
                          <td className="px-4 py-3 text-gray-700">
                            {m?.name || (m ? `${m.brand} ${m.model}` : '—')}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase ${statusColors[q.status] ?? 'bg-gray-100 text-gray-600'}`}>
                              {q.status.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400">
                            {new Date(q.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </td>
                          <td className="px-4 py-3">
                            <Link href={`/admin/quotes/${q.id}`} className="text-blue-700 hover:underline text-xs font-medium">
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
          </div>
        )}

      </main>
    </div>
  )
}
