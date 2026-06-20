import { createClient } from '@/lib/supabase/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const wearRank: Record<string, number> = {
  excellent: 0, good: 1, wear_detected: 2, needs_repair: 3,
}
const wearLabel: Record<string, string> = {
  excellent: 'Excellent', good: 'Good', wear_detected: 'Wear Detected', needs_repair: 'Needs Repair',
}
const wearColors: Record<string, string> = {
  excellent: 'text-green-700', good: 'text-blue-700',
  wear_detected: 'text-amber-700', needs_repair: 'text-red-700',
}

function worstWear(wear: Record<string, string>): string {
  const vals = Object.values(wear ?? {})
  if (!vals.length) return '—'
  const worst = vals.reduce((a, b) => (wearRank[b] ?? 0) > (wearRank[a] ?? 0) ? b : a)
  return wearLabel[worst] ?? worst
}

function worstWearKey(wear: Record<string, string>): string {
  const vals = Object.values(wear ?? {})
  if (!vals.length) return ''
  return vals.reduce((a, b) => (wearRank[b] ?? 0) > (wearRank[a] ?? 0) ? b : a)
}

const ROWS = [
  { key: 'category',           label: 'Category' },
  { key: 'year',               label: 'Year' },
  { key: 'engine_hours',       label: 'Engine Hours',        fmt: (v: unknown) => v ? `${Number(v).toLocaleString()} hrs` : '—' },
  { key: 'price_usd',          label: 'Asking Price',        fmt: (v: unknown) => v ? `$${Number(v).toLocaleString()}` : '—' },
  { key: 'operating_weight_kg',label: 'Operating Weight',    fmt: (v: unknown) => v ? `${Number(v).toLocaleString()} kg` : '—' },
  { key: 'engine_configuration',label: 'Engine Config' },
  { key: 'hours_since_service',label: 'Hrs Since Service',   fmt: (v: unknown) => v ? `${Number(v).toLocaleString()} hrs` : '—' },
  { key: 'serial_number',      label: 'Serial Number' },
  { key: 'yard_location',      label: 'Yard Location' },
  { key: 'wear_summary',       label: 'Worst Component Wear' },
]

export default async function ComparisonPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: watchlistItems } = await adminSupabase
    .from('watchlist')
    .select('machine_id, machines(*)')
    .eq('buyer_id', user.id)
    .eq('in_comparison', true)

  const machines = (watchlistItems ?? []).map(w => w.machines as unknown as Record<string, unknown>).filter(Boolean)

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/machines" className="text-sm text-gray-500 hover:text-gray-900">← Inventory</Link>
          <h1 className="text-lg font-bold text-gray-900">Comparison Workbench</h1>
        </div>
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900">Dashboard</Link>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {machines.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-gray-500 mb-2">No machines in your comparison tray.</p>
            <p className="text-sm text-gray-400 mb-6">
              Browse inventory and click <strong>Compare</strong> on any machine card to add it here.
            </p>
            <Link href="/machines" className="bg-blue-700 text-white px-5 py-2 rounded-md text-sm font-semibold hover:bg-blue-800">
              Browse Inventory
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-40 bg-gray-50">
                    Specification
                  </th>
                  {machines.map(m => (
                    <th key={m.id as string} className="px-5 py-4 text-left min-w-[200px]">
                      <Link href={`/machines/${m.id}`} className="hover:underline">
                        <p className="font-bold text-gray-900 text-sm">{m.brand as string} {m.model as string}</p>
                        <p className="text-xs text-gray-400 font-normal">{m.year as number}</p>
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ROWS.map(row => (
                  <tr key={row.key} className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">
                      {row.label}
                    </td>
                    {machines.map(m => {
                      let value: string

                      if (row.key === 'yard_location') {
                        value = `${m.yard_city}, ${m.yard_country}`
                      } else if (row.key === 'wear_summary') {
                        const wearKey = worstWearKey(m.wear_analysis as Record<string, string> ?? {})
                        const label = worstWear(m.wear_analysis as Record<string, string> ?? {})
                        return (
                          <td key={m.id as string} className={`px-5 py-3 font-medium ${wearColors[wearKey] ?? 'text-gray-600'}`}>
                            {label}
                          </td>
                        )
                      } else if (row.fmt) {
                        value = row.fmt(m[row.key])
                      } else {
                        value = m[row.key] != null ? String(m[row.key]) : '—'
                      }

                      return (
                        <td key={m.id as string} className="px-5 py-3 text-gray-800">
                          {value || '—'}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
