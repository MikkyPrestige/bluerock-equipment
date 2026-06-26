'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Pagination from '@/components/ui/Pagination'
import WatchlistExportButtons from '@/components/dashboard/WatchlistExportButtons'
import { createClient } from '@/lib/supabase/client'
import excImg       from '@/assests/img/machinery/machine-card-excavator-openpit.jpg'
import bullImg      from '@/assests/img/machinery/machine-card-bulldozer-field.jpg'
import loaderImg    from '@/assests/img/machinery/machine-card-wheel-loader-gravel.jpg'
import graderImg    from '@/assests/img/machinery/machine-card-motor-grader-road.jpg'
import truckImg     from '@/assests/img/machinery/freight-port-crane-containers.jpg'
import compactorImg from '@/assests/img/machinery/yard-operations-aerial-storage.jpg'

const PAGE_SIZE = 5

const CATEGORY_IMAGES: Record<string, typeof excImg> = {
  'Excavator':         excImg,
  'Bulldozer':         bullImg,
  'Wheel Loader':      loaderImg,
  'Motor Grader':      graderImg,
  'Articulated Truck': truckImg,
  'Compactor':         compactorImg,
}
function catImg(cat?: string | null) {
  return CATEGORY_IMAGES[cat ?? ''] ?? excImg
}

const MACHINE_STATUS_COLOR: Record<string, string> = {
  available:       'text-emerald-400',
  pending_hold:    'text-amber-400',
  reserved:        'text-amber-400',
  payment_pending: 'text-orange-400',
  sold:            'text-red-400',
}

export type WatchlistEntry = {
  machine_id: string
  in_comparison: boolean
  created_at: string
  machines: {
    id: string
    name?: string | null
    brand: string
    model: string
    price_usd: number
    status: string
    category?: string | null
  } | null
}

interface Props {
  initialEntries: WatchlistEntry[]
  totalCount: number
}

const supabase = createClient()

export default function WatchlistCard({ initialEntries, totalCount }: Props) {
  const [rows,        setRows]        = useState<WatchlistEntry[]>(initialEntries)
  const [page,        setPage]        = useState(0)
  const [pageLoading, setPageLoading] = useState(false)

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  async function fetchPage(p: number) {
    setPageLoading(true)
    try {
      const { data } = await supabase
        .from('watchlist')
        .select('machine_id, in_comparison, created_at, machines(id, name, brand, model, price_usd, status, category)')
        .order('created_at', { ascending: false })
        .range(p * PAGE_SIZE, (p + 1) * PAGE_SIZE - 1)
      if (data) { setRows(data as unknown as WatchlistEntry[]); setPage(p) }
    } finally {
      setPageLoading(false)
    }
  }

  if (totalCount === 0) {
    return (
      <div className="px-5 py-10 text-center">
        <p className="text-white/25 text-sm mb-3">No saved machines yet.</p>
        <Link href="/machines" className="text-gold-400 text-sm font-semibold hover:text-gold-300 transition-colors">
          Browse inventory →
        </Link>
      </div>
    )
  }

  return (
    <div className={pageLoading ? 'opacity-60 pointer-events-none' : ''}>
      {/* Export + View all bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/6">
        <WatchlistExportButtons count={totalCount} />
        <Link href="/dashboard/watchlist" className="text-xs text-gold-400 hover:text-gold-300 transition-colors">
          View all →
        </Link>
      </div>

      {/* Machine list */}
      <div className="divide-y divide-white/5 px-5">
        {rows.map(w => {
          const m = w.machines
          if (!m) return null
          const machineName = m.name || `${m.brand} ${m.model}`
          const statusColor = MACHINE_STATUS_COLOR[m.status] ?? 'text-white/35'
          const statusText  = m.status.replace(/_/g, ' ')

          return (
            <div key={w.machine_id} className="flex items-center gap-3.5 py-3.5">
              <div className="w-14 h-10 rounded-lg overflow-hidden flex-shrink-0 relative bg-navy-800">
                <Image
                  src={catImg(m.category)}
                  alt={m.category ?? ''}
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              </div>
              <div className="flex-1 min-w-0">
                <Link
                  href={`/machines/${m.id}`}
                  className="text-sm font-semibold text-white hover:text-gold-300 transition-colors duration-150 truncate block"
                >
                  {machineName}
                </Link>
                <p className={`text-[10px] uppercase font-semibold tracking-wide mt-0.5 ${statusColor}`}>
                  {statusText}
                </p>
              </div>
              <p className="text-gold-400 text-sm font-bold flex-shrink-0">
                ${Number(m.price_usd).toLocaleString()}
              </p>
            </div>
          )
        })}
      </div>

      {totalCount > PAGE_SIZE && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPrevious={() => fetchPage(page - 1)}
          onNext={() => fetchPage(page + 1)}
          showingFrom={page * PAGE_SIZE + 1}
          showingTo={Math.min((page + 1) * PAGE_SIZE, totalCount)}
          totalCount={totalCount}
          label="saved machines"
        />
      )}
    </div>
  )
}
