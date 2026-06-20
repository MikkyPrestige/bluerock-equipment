import { adminSupabase } from '@/lib/supabase/admin'
import Link from 'next/link'
import FreightRatesTable from '@/components/admin/FreightRatesTable'

export default async function FreightRatesPage() {
  const { data: rates } = await adminSupabase
    .from('freight_rates')
    .select('id, port_name, country, base_cost_usd, updated_at')
    .order('country')
    .order('port_name')

  const all = rates ?? []

  // Most recent and oldest update dates for the banner
  const sortedDates = all
    .map(r => new Date(r.updated_at).getTime())
    .sort((a, b) => b - a)

  const lastUpdated = sortedDates[0]
    ? new Date(sortedDates[0]).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null

  const oldestUpdated = sortedDates.at(-1)
    ? new Date(sortedDates.at(-1)!).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null

  // Flag if any rate hasn't been updated in >30 days
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
  const staleCount = all.filter(r => new Date(r.updated_at).getTime() < thirtyDaysAgo).length

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-900">← Admin</Link>
        <h1 className="text-lg font-bold text-gray-900">Freight Rates</h1>
      </header>

      {/* Yellow banner */}
      <div className="bg-amber-50 border-b border-amber-200 px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm font-semibold text-amber-900">
              {lastUpdated ? `Last updated: ${lastUpdated}` : 'No rates loaded yet'}
              {oldestUpdated && oldestUpdated !== lastUpdated && (
                <span className="font-normal text-amber-700 ml-2">· Oldest entry: {oldestUpdated}</span>
              )}
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Monthly refresh needed — verify base costs with your shipping partners before quoting freight estimates.
            </p>
          </div>
          {staleCount > 0 && (
            <span className="flex-shrink-0 text-xs font-bold bg-amber-200 text-amber-900 px-3 py-1 rounded-full">
              {staleCount} rate{staleCount > 1 ? 's' : ''} overdue for refresh
            </span>
          )}
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <FreightRatesTable rates={all} />
      </main>
    </div>
  )
}
