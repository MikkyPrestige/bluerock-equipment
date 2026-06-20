import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import SignOutButton from './signout-button'
import logo from '@/assests/img/logo.jpg'

const quoteStatusLabel: Record<string, { label: string; classes: string }> = {
  pending_quote:     { label: 'Awaiting Quote',      classes: 'bg-amber-100 text-amber-800' },
  invoice_generated: { label: 'Proforma Ready',      classes: 'bg-blue-100 text-blue-800' },
  buyer_accepted:    { label: 'Accepted',             classes: 'bg-indigo-100 text-indigo-800' },
  payment_pending:   { label: 'Payment Pending',      classes: 'bg-orange-100 text-orange-800' },
  payment_confirmed: { label: 'Payment Confirmed',    classes: 'bg-teal-100 text-teal-800' },
  sold:              { label: 'Sold',                 classes: 'bg-green-100 text-green-800' },
  cancelled:         { label: 'Cancelled',            classes: 'bg-gray-100 text-gray-600' },
}

export default async function DashboardPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/auth/login')

    const [{ data: buyer }, { data: quotes }, { data: watchlist }] = await Promise.all([
        supabase.from('buyers').select('*').eq('id', user.id).single(),
        supabase
            .from('quotes')
            .select('id, status, total_amount, lock_expires_at, created_at, port_of_discharge, machines(name, brand, model, price_usd)')
            .eq('buyer_id', user.id)
            .order('created_at', { ascending: false }),
        supabase
            .from('watchlist')
            .select('machine_id, in_comparison, created_at, machines(id, name, brand, model, price_usd, status)')
            .eq('buyer_id', user.id)
            .order('created_at', { ascending: false }),
    ])

    const comparisonCount = (watchlist ?? []).filter(w => w.in_comparison).length

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <Link href="/">
                  <Image src={logo} alt="BlueRock Equipment" className="h-9 w-auto object-contain" />
                </Link>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500">{buyer?.company_name || user.email}</span>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase ${buyer?.tier === 'gold' ? 'bg-yellow-100 text-yellow-800' :
                        buyer?.tier === 'silver' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-600'
                        }`}>
                        {buyer?.tier || 'observer'}
                    </span>
                    <SignOutButton />
                </div>
                </header>

                <main className="max-w-7xl mx-auto px-6 py-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                                Watchlist & Alerts
                                {watchlist && watchlist.length > 0 && (
                                    <span className="ml-2 text-xs font-normal text-gray-400">({watchlist.length})</span>
                                )}
                            </h2>
                            {!watchlist || watchlist.length === 0 ? (
                                <div>
                                    <p className="text-sm text-gray-400">No saved machines yet.</p>
                                    <Link href="/machines" className="mt-2 inline-block text-sm text-blue-700 hover:underline">Browse inventory →</Link>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {watchlist.map(w => {
                                        const m = w.machines as unknown as { id: string; name?: string; brand: string; model: string; price_usd: number; status: string } | null
                                        if (!m) return null
                                        return (
                                            <div key={w.machine_id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                                                <Link href={`/machines/${m.id}`} className="text-sm font-medium text-gray-900 hover:underline">
                                                    {m.name || `${m.brand} ${m.model}`}
                                                </Link>
                                                <span className="text-sm text-gray-500">${Number(m.price_usd).toLocaleString()}</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Comparison Workbench</h2>
                            {comparisonCount > 0 ? (
                                <div>
                                    <p className="text-sm text-gray-700 mb-3">
                                        {comparisonCount} machine{comparisonCount > 1 ? 's' : ''} in your tray.
                                    </p>
                                    <Link href="/comparison" className="bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-blue-800 inline-block">
                                        Open Workbench
                                    </Link>
                                </div>
                            ) : (
                                <div>
                                    <p className="text-sm text-gray-400">No machines selected for comparison.</p>
                                    <p className="text-xs text-gray-400 mt-1">Click &quot;Compare&quot; on any machine card to add it.</p>
                                </div>
                            )}
                        </div>

                        <div className="bg-white rounded-lg border border-gray-200 p-6 md:col-span-2">
                            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">My Quotes & Transactions</h2>
                            {!quotes || quotes.length === 0 ? (
                                <div>
                                    <p className="text-sm text-gray-400">No quotes yet.</p>
                                    <Link href="/machines" className="mt-2 inline-block text-sm text-blue-700 hover:underline">
                                        Browse inventory →
                                    </Link>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {quotes.map(q => {
                                        const machine = q.machines as unknown as { name?: string; brand: string; model: string; price_usd: number } | null
                                        const machineName = machine?.name || `${machine?.brand} ${machine?.model}`
                                        const status = quoteStatusLabel[q.status] ?? { label: q.status, classes: 'bg-gray-100 text-gray-600' }
                                        const lockDate = q.lock_expires_at ? new Date(q.lock_expires_at) : null
                                        const hoursLeft = lockDate ? Math.max(0, Math.ceil((lockDate.getTime() - Date.now()) / 3600000)) : null
                                        return (
                                            <div key={q.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900">{machineName}</p>
                                                    <p className="text-xs text-gray-400 mt-0.5">
                                                        Port: {q.port_of_discharge || '—'}
                                                        {hoursLeft !== null && hoursLeft > 0 && (
                                                            <span className="ml-2 text-amber-600">{hoursLeft}h lock remaining</span>
                                                        )}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm font-bold text-gray-900">
                                                        {q.total_amount
                                                            ? `$${Number(q.total_amount).toLocaleString()}`
                                                            : `$${Number(machine?.price_usd || 0).toLocaleString()} +freight`}
                                                    </span>
                                                    <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase ${status.classes}`}>
                                                        {status.label}
                                                    </span>
                                                    <Link
                                                        href={`/dashboard/quotes/${q.id}`}
                                                        className="text-xs text-blue-700 hover:underline font-medium whitespace-nowrap"
                                                    >
                                                        View Details
                                                    </Link>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Live Walkthrough Schedule</h2>
                            <p className="text-sm text-gray-400">No upcoming walkthroughs.</p>
                        </div>
                    </div>
                </main>
        </div>
    )
}