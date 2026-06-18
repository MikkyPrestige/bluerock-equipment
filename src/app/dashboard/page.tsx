import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SignOutButton from './signout-button'

export default async function DashboardPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/auth/login')

    const { data: buyer } = await supabase
        .from('buyers')
        .select('*')
        .eq('id', user.id)
        .single()

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h1 className="text-lg font-bold text-gray-900">BlueRock Equipment</h1>
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
                            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Watchlist & Alerts</h2>
                            <p className="text-sm text-gray-400">No saved machines yet.</p>
                        </div>

                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Comparison Workbench</h2>
                            <p className="text-sm text-gray-400">No machines selected for comparison.</p>
                        </div>

                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Logistics Tracker & Vault</h2>
                            <p className="text-sm text-gray-400">No active transactions.</p>
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