import Link from 'next/link'
import WatchlistButton from './WatchlistButton'
import CompareToggle from './CompareToggle'

interface Machine {
    id: string
    brand: string
    model: string
    year: number
    category: string
    use_case: string
    engine_hours: number
    price_usd: number
    yard_city: string
    yard_country: string
    status: string
    wear_analysis: Record<string, string>
    media_urls: string[]
    description?: string
    serial_number?: string
    operating_weight_kg?: number
    engine_configuration?: string
    hours_since_service?: number
    video_url?: string
    inspection_report_url?: string
}

const statusColors: Record<string, string> = {
    available: 'bg-green-100 text-green-800',
    pending_hold: 'bg-amber-100 text-amber-800',
    reserved: 'bg-amber-100 text-amber-800',
    payment_pending: 'bg-orange-100 text-orange-800',
    sold: 'bg-red-100 text-red-800',
}

export default function MachineCard({
    machine,
    isWatchlisted = false,
    isInComparison = false,
    showActions = false,
}: {
    machine: Machine
    isWatchlisted?: boolean
    isInComparison?: boolean
    showActions?: boolean
}) {
    return (
        <div className="bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all overflow-hidden">
            <Link href={`/machines/${machine.id}`} className="block p-5">

                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                    <div>
                        <h3 className="font-bold text-gray-900 text-base">
                            {machine.brand} {machine.model}
                        </h3>
                        <p className="text-sm text-gray-500">{machine.year} · {machine.category}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase whitespace-nowrap ${statusColors[machine.status] || 'bg-gray-100 text-gray-600'}`}>
                        {machine.status.replace(/_/g, ' ')}
                    </span>
                </div>

                {/* Key Stats */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-gray-50 rounded-md px-3 py-2">
                        <p className="text-xs text-gray-500">Engine Hours</p>
                        <p className="text-sm font-semibold text-gray-900">{machine.engine_hours.toLocaleString()} hrs</p>
                    </div>
                    <div className="bg-gray-50 rounded-md px-3 py-2">
                        <p className="text-xs text-gray-500">Asking Price</p>
                        <p className="text-sm font-semibold text-gray-900">${Number(machine.price_usd).toLocaleString()}</p>
                    </div>
                </div>

                {/* Yard Location */}
                <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                        📍 {machine.yard_city}, {machine.yard_country}
                    </p>
                    <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-full">
                        ✓ 150-Point Inspected
                    </span>
                </div>
            </Link>

            {showActions && (
                <div className="border-t border-gray-100 px-5 py-2.5 flex items-center justify-between bg-gray-50">
                    <WatchlistButton machineId={machine.id} initialWatchlisted={isWatchlisted} />
                    <CompareToggle machineId={machine.id} initialInComparison={isInComparison} />
                </div>
            )}
        </div>
    )
}
