import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import GenerateReportButton from '@/components/admin/GenerateReportButton'

export default async function AdminInventoryPage() {
    const supabase = await createClient()
    const { data: machines } = await supabase
        .from('machines')
        .select('*')
        .order('created_at', { ascending: false })

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <h1 className="text-lg font-bold text-gray-900">Admin — Inventory</h1>
                    <Link href="/admin/quotes" className="text-sm text-gray-500 hover:text-gray-900">Quotes</Link>
                </div>
                <Link
                    href="/admin/inventory/new"
                    className="bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-800"
                >
                    + Add Machine
                </Link>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
                {!machines || machines.length === 0 ? (
                    <div className="text-center py-24">
                        <p className="text-gray-400 text-sm">No machines in inventory yet.</p>
                        <Link
                            href="/admin/inventory/new"
                            className="mt-4 inline-block bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-800"
                        >
                            Add your first machine
                        </Link>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-4 py-3 text-left font-medium text-gray-600">Machine</th>
                                    <th className="px-4 py-3 text-left font-medium text-gray-600">Year</th>
                                    <th className="px-4 py-3 text-left font-medium text-gray-600">Hours</th>
                                    <th className="px-4 py-3 text-left font-medium text-gray-600">Price (USD)</th>
                                    <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                                    <th className="px-4 py-3 text-left font-medium text-gray-600">Yard</th>
                                    <th className="px-4 py-3 text-left font-medium text-gray-600">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {machines.map(machine => (
                                    <tr key={machine.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium text-gray-900">
                                            {machine.brand} {machine.model}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">{machine.year}</td>
                                        <td className="px-4 py-3 text-gray-600">{machine.engine_hours.toLocaleString()} hrs</td>
                                        <td className="px-4 py-3 text-gray-600">${Number(machine.price_usd).toLocaleString()}</td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase ${machine.status === 'available' ? 'bg-green-100 text-green-800' :
                                                    machine.status === 'sold' ? 'bg-red-100 text-red-800' :
                                                        'bg-amber-100 text-amber-800'
                                                }`}>
                                                {machine.status.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">{machine.yard_city}, {machine.yard_country}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-4">
                                                <Link
                                                    href={`/admin/inventory/${machine.id}/edit`}
                                                    className="text-blue-700 hover:underline text-sm font-medium"
                                                >
                                                    Edit
                                                </Link>
                                                <GenerateReportButton
                                                    machineId={machine.id}
                                                    hasReport={!!machine.inspection_report_url}
                                                />
                                            </div>
                                        </td>
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