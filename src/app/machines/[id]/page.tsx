import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

const wearColors: Record<string, string> = {
  excellent: 'bg-green-100 text-green-800',
  good: 'bg-blue-100 text-blue-800',
  wear_detected: 'bg-amber-100 text-amber-800',
  needs_repair: 'bg-red-100 text-red-800',
}

const statusColors: Record<string, string> = {
  available: 'bg-green-100 text-green-800',
  pending_hold: 'bg-amber-100 text-amber-800',
  reserved: 'bg-amber-100 text-amber-800',
  payment_pending: 'bg-orange-100 text-orange-800',
  sold: 'bg-red-100 text-red-800',
}

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

export default async function MachineDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { id } = await params

  const { data: machine, error } = await supabase
    .from('machines')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !machine) notFound()

  const m = machine as Machine
  const wearAnalysis = m.wear_analysis || {}
  const mediaUrls = m.media_urls || []

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <Link href="/machines" className="text-sm text-blue-700 hover:underline">
          Back to inventory
        </Link>
        <h1 className="text-lg font-bold text-gray-900">BlueRock Equipment</h1>
        <Link href="/auth/login" className="text-sm bg-blue-700 text-white px-4 py-2 rounded-md hover:bg-blue-800">
          Sign in
        </Link>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{m.brand} {m.model}</h2>
              <p className="text-gray-500 mt-1">{m.year} · {m.category} · {m.use_case}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-700">${Number(m.price_usd).toLocaleString()}</p>
              <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase ${statusColors[m.status] || 'bg-gray-100 text-gray-600'}`}>
                {m.status.replace(/_/g, ' ')}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-gray-50 rounded-md px-4 py-3">
              <p className="text-xs text-gray-500">Engine Hours</p>
              <p className="text-sm font-bold text-gray-900">{m.engine_hours.toLocaleString()} hrs</p>
            </div>
            <div className="bg-gray-50 rounded-md px-4 py-3">
              <p className="text-xs text-gray-500">Yard Location</p>
              <p className="text-sm font-bold text-gray-900">{m.yard_city}, {m.yard_country}</p>
            </div>
            {m.serial_number && (
              <div className="bg-gray-50 rounded-md px-4 py-3">
                <p className="text-xs text-gray-500">Serial Number</p>
                <p className="text-sm font-bold text-gray-900">{m.serial_number}</p>
              </div>
            )}
            {m.operating_weight_kg && (
              <div className="bg-gray-50 rounded-md px-4 py-3">
                <p className="text-xs text-gray-500">Operating Weight</p>
                <p className="text-sm font-bold text-gray-900">{Number(m.operating_weight_kg).toLocaleString()} kg</p>
              </div>
            )}
            {m.engine_configuration && (
              <div className="bg-gray-50 rounded-md px-4 py-3">
                <p className="text-xs text-gray-500">Engine Config</p>
                <p className="text-sm font-bold text-gray-900">{m.engine_configuration}</p>
              </div>
            )}
            {m.hours_since_service && (
              <div className="bg-gray-50 rounded-md px-4 py-3">
                <p className="text-xs text-gray-500">Hrs Since Service</p>
                <p className="text-sm font-bold text-gray-900">{m.hours_since_service.toLocaleString()} hrs</p>
              </div>
            )}
          </div>

          <span className="inline-flex items-center text-xs font-medium text-green-700 bg-green-50 px-3 py-1 rounded-full">
            150-Point Yard Inspection Completed
          </span>
        </div>

        {m.description && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">About This Machine</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{m.description}</p>
          </div>
        )}

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Media</h3>
          {mediaUrls.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              {mediaUrls.map((url: string, i: number) => (
                  <Image key={i} src={url} alt={`${m.brand} ${m.model} photo ${i + 1}`} width={400} height={192} className="w-full h-48 object-cover rounded-md" />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 mb-4">Photos coming soon.</p>
          )}
          {m.video_url && (
            <a href={m.video_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-blue-700 font-medium hover:underline">
              Watch Video Walkthrough
            </a>
          )}
        </div>

        {Object.keys(wearAnalysis).length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Component Wear Analysis</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(wearAnalysis).map(([component, status]) => (
                <div key={component} className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-md">
                  <span className="text-sm font-medium text-gray-700 capitalize">{component.replace(/_/g, ' ')}</span>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full capitalize ${wearColors[status] || 'bg-gray-100 text-gray-600'}`}>
                    {status.replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Inspection Report</h3>
          {m.inspection_report_url ? (
            <a href={m.inspection_report_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-800">
              Download Inspection Report PDF
            </a>
          ) : (
            <p className="text-sm text-gray-400">Inspection report pending generation.</p>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Ballpark Freight Estimator</h3>
          <p className="text-sm text-gray-400">Freight estimator coming in Sprint 5.</p>
        </div>

        <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
          {m.status === 'available' ? (
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Ready to proceed?</h3>
                <p className="text-sm text-gray-500 mt-1">Sign in to request a delivery quote for this machine.</p>
              </div>
              <Link href="/auth/login" className="bg-blue-700 text-white px-6 py-3 rounded-md text-sm font-semibold hover:bg-blue-800 whitespace-nowrap">
                Request Quote
              </Link>
            </div>
          ) : (
            <div>
              <h3 className="font-semibold text-gray-900">This machine is currently {m.status.replace(/_/g, ' ')}</h3>
              <p className="text-sm text-gray-500 mt-1">Get notified when a similar machine becomes available.</p>
              <Link href="/auth/signup" className="mt-3 inline-block bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-800">
                Notify Me When Similar Arrives
              </Link>
            </div>
          )}
        </div>

      </main>
    </div>
  )
}
