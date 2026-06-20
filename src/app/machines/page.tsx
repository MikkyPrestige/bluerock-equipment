import { createClient } from '@/lib/supabase/server'
import { adminSupabase } from '@/lib/supabase/admin'
import MachineCard from '@/components/machine/MachineCard'
import ComparisonTray from '@/components/comparison/ComparisonTray'
import Link from 'next/link'
import Image from 'next/image'
import logo from '@/assests/img/logo.jpg'

const CATEGORIES = ['Excavator', 'Bulldozer', 'Wheel Loader', 'Motor Grader', 'Articulated Truck', 'Compactor']
const BRANDS = ['Caterpillar', 'Komatsu', 'Volvo', 'Sany', 'Hitachi', 'Liebherr']
const USE_CASES = ['Construction', 'Mining & Quarrying', 'Port Operations', 'Agriculture', 'Road Building']

export default async function MachinesPage({
    searchParams,
}: {
    searchParams: Promise<{ category?: string; brand?: string; use_case?: string }>
}) {
    const supabase = await createClient()
    const params = await searchParams

    const { data: { user } } = await supabase.auth.getUser()

    let query = supabase
        .from('machines')
        .select('*')
        .order('created_at', { ascending: false })

    if (params.category) query = query.eq('category', params.category)
    if (params.brand) query = query.eq('brand', params.brand)
    if (params.use_case) query = query.eq('use_case', params.use_case)

    const { data: machines, error } = await query

    if (error) return <div className="p-8 text-red-600">Error loading machines: {error.message}</div>

    // Fetch watchlist state for the current buyer (if logged in)
    let watchlistedIds = new Set<string>()
    let comparisonIds = new Set<string>()
    if (user) {
        const { data: wl } = await adminSupabase
            .from('watchlist')
            .select('machine_id, in_comparison')
            .eq('buyer_id', user.id)
        for (const w of wl ?? []) {
            watchlistedIds.add(w.machine_id)
            if (w.in_comparison) comparisonIds.add(w.machine_id)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <Link href="/">
                  <Image src={logo} alt="BlueRock Equipment" className="h-9 w-auto object-contain" />
                </Link>
                <div className="flex items-center gap-4">
                    <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900">Dashboard</Link>
                    <Link href="/auth/login" className="text-sm bg-blue-700 text-white px-4 py-2 rounded-md hover:bg-blue-800">Sign in</Link>
                </div>
            </header>

            {/* Trust Banner */}
            <div className="bg-blue-700 px-6 py-2">
                <div className="max-w-7xl mx-auto flex items-center justify-center gap-4 sm:gap-8 text-xs text-blue-100 font-medium">
                    <span>✓ 150-Point Inspected</span>
                    <span className="hidden sm:inline text-blue-400">|</span>
                    <span className="hidden sm:inline">Direct Seller — No Broker</span>
                    <span className="hidden sm:inline text-blue-400">|</span>
                    <span className="hidden sm:inline">48-Hour Price Lock</span>
                    <span className="hidden sm:inline text-blue-400">|</span>
                    <Link href="/trust" className="text-blue-200 hover:text-white underline hidden sm:inline">Trust Hub →</Link>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3">
                <div className="max-w-7xl mx-auto overflow-x-auto">
                <div className="flex flex-wrap gap-2 items-center min-w-max sm:min-w-0 pb-1 sm:pb-0">
                    <span className="text-sm font-medium text-gray-600">Filter:</span>

                    {/* Category */}
                    <div className="flex gap-2 flex-wrap">
                        <Link
                            href="/machines"
                            className={`text-xs px-3 py-1 rounded-full border font-medium ${!params.category && !params.brand && !params.use_case ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'}`}
                        >
                            All
                        </Link>
                        {CATEGORIES.map(cat => (
                            <Link
                                key={cat}
                                href={`/machines?category=${encodeURIComponent(cat)}${params.brand ? `&brand=${encodeURIComponent(params.brand)}` : ''}${params.use_case ? `&use_case=${encodeURIComponent(params.use_case)}` : ''}`}
                                className={`text-xs px-3 py-1 rounded-full border font-medium ${params.category === cat ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'}`}
                            >
                                {cat}
                            </Link>
                        ))}
                    </div>

                    {/* Brand */}
                    <div className="flex gap-2 flex-wrap">
                        {BRANDS.map(brand => (
                            <Link
                                key={brand}
                                href={`/machines?brand=${encodeURIComponent(brand)}${params.category ? `&category=${encodeURIComponent(params.category)}` : ''}${params.use_case ? `&use_case=${encodeURIComponent(params.use_case)}` : ''}`}
                                className={`text-xs px-3 py-1 rounded-full border font-medium ${params.brand === brand ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'}`}
                            >
                                {brand}
                            </Link>
                        ))}
                    </div>

                    {/* Use Case */}
                    <div className="flex gap-2 flex-wrap">
                        {USE_CASES.map(uc => (
                            <Link
                                key={uc}
                                href={`/machines?use_case=${encodeURIComponent(uc)}${params.category ? `&category=${encodeURIComponent(params.category)}` : ''}${params.brand ? `&brand=${encodeURIComponent(params.brand)}` : ''}`}
                                className={`text-xs px-3 py-1 rounded-full border font-medium ${params.use_case === uc ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'}`}
                            >
                                {uc}
                            </Link>
                        ))}
                    </div>
                </div>
                </div>
            </div>

            {/* Inventory Grid */}
            <main className="max-w-7xl mx-auto px-6 py-8">
                {!machines || machines.length === 0 ? (
                    <div className="text-center py-24">
                        <p className="text-gray-400 text-sm">No machines found matching your filters.</p>
                        <Link href="/machines" className="mt-4 inline-block text-blue-700 text-sm font-medium hover:underline">
                            Clear filters
                        </Link>
                    </div>
                ) : (
                    <>
                        <p className="text-sm text-gray-500 mb-6">{machines.length} machine{machines.length !== 1 ? 's' : ''} available</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {machines.map(machine => (
                                <MachineCard
                                    key={machine.id}
                                    machine={machine}
                                    isWatchlisted={watchlistedIds.has(machine.id)}
                                    isInComparison={comparisonIds.has(machine.id)}
                                    showActions={!!user}
                                />
                            ))}
                        </div>
                    </>
                )}
            </main>

            {user && <ComparisonTray />}
        </div>
    )
}