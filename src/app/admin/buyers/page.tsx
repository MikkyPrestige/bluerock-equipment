import { adminSupabase } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import NotifyButton from '@/components/admin/NotifyButton'

const tierColors: Record<string, string> = {
  observer: 'bg-gray-100 text-gray-600',
  silver:   'bg-blue-100 text-blue-800',
  gold:     'bg-yellow-100 text-yellow-800',
}

const machineStatusColors: Record<string, string> = {
  pending_hold:    'bg-amber-100 text-amber-800',
  reserved:        'bg-amber-100 text-amber-800',
  payment_pending: 'bg-orange-100 text-orange-800',
  sold:            'bg-red-100 text-red-800',
}

export default async function AdminBuyersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) redirect('/auth/login')

  const [
    { data: buyers },
    { data: quoteCounts },
    { data: allWatchlist },
  ] = await Promise.all([
    adminSupabase.from('buyers').select('*').order('created_at', { ascending: false }),
    adminSupabase.from('quotes').select('buyer_id'),
    adminSupabase
      .from('watchlist')
      .select(`
        buyer_id, machine_id, arrival_alert_params, created_at,
        machines(id, name, brand, model, year, category, status),
        buyers(id, email, company_name)
      `)
      .order('created_at', { ascending: false }),
  ])

  // Quote count per buyer
  const countMap: Record<string, number> = {}
  for (const q of quoteCounts ?? []) {
    countMap[q.buyer_id] = (countMap[q.buyer_id] ?? 0) + 1
  }

  // Waitlist = watching a machine that's no longer available
  // OR has an explicit arrival_alert_params set
  const waitlist = (allWatchlist ?? []).filter(w => {
    const m = w.machines as unknown as { status: string } | null
    const unavailable = m && m.status !== 'available'
    const hasAlert = w.arrival_alert_params != null
    return unavailable || hasAlert
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h1 className="text-lg font-bold text-gray-900">Admin — Buyers</h1>
          <Link href="/admin/inventory" className="text-sm text-gray-500 hover:text-gray-900">Inventory</Link>
          <Link href="/admin/quotes" className="text-sm text-gray-500 hover:text-gray-900">Quotes</Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* Buyer Table */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            All Buyers ({buyers?.length ?? 0})
          </h2>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Company</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Tier</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">KYC</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Quotes</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Port</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(buyers ?? []).map(b => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{b.company_name || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{b.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase ${tierColors[b.tier] ?? 'bg-gray-100 text-gray-600'}`}>
                        {b.tier}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {b.kyc_verified
                        ? <span className="text-xs text-green-700 font-semibold">Verified</span>
                        : <span className="text-xs text-gray-400">Pending</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{countMap[b.id] ?? 0}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{b.preferred_port_of_discharge || '—'}</td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/buyers/${b.id}`} className="text-blue-700 hover:underline text-sm font-medium">
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Waitlist & Arrival Alerts */}
        <div>
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Waitlist &amp; Arrival Alerts
            </h2>
            <span className="text-xs bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-full">
              {waitlist.length} buyer{waitlist.length !== 1 ? 's' : ''}
            </span>
          </div>

          {waitlist.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <p className="text-sm text-gray-400">
                No buyers are currently waiting on held or sold machines.
              </p>
              <p className="text-xs text-gray-400 mt-1">
                This section populates when buyers save machines that become pending or sold.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="bg-amber-50 border-b border-amber-100 px-4 py-2">
                <p className="text-xs text-amber-800">
                  These buyers saved machines that are now held or sold. Use &ldquo;Notify&rdquo; to email them when a similar machine is available.
                </p>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Buyer</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Machine They Saved</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Category</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Machine Status</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Alert Params</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {waitlist.map(w => {
                    const m = w.machines as unknown as {
                      id: string; name?: string; brand: string; model: string
                      year: number; category: string; status: string
                    } | null
                    const b = w.buyers as unknown as { id: string; email: string; company_name: string | null } | null
                    const machineName = m?.name ?? (m ? `${m.year} ${m.brand} ${m.model}` : '—')

                    return (
                      <tr key={`${w.buyer_id}-${w.machine_id}`} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{b?.company_name || '—'}</p>
                          <p className="text-xs text-gray-400">{b?.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          {m ? (
                            <Link href={`/machines/${m.id}`} className="text-gray-800 hover:underline font-medium">
                              {machineName}
                            </Link>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{m?.category ?? '—'}</td>
                        <td className="px-4 py-3">
                          {m?.status ? (
                            <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase ${machineStatusColors[m.status] ?? 'bg-gray-100 text-gray-600'}`}>
                              {m.status.replace(/_/g, ' ')}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400 font-mono">
                          {w.arrival_alert_params
                            ? JSON.stringify(w.arrival_alert_params)
                            : <span className="text-gray-300">none</span>}
                        </td>
                        <td className="px-4 py-3">
                          {b && m ? (
                            <NotifyButton
                              buyerId={b.id}
                              buyerEmail={b.email}
                              companyName={b.company_name}
                              machineName={machineName}
                              machineCategory={m.category}
                            />
                          ) : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>
    </div>
  )
}
