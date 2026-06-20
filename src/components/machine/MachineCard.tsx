import Link from 'next/link'
import Image from 'next/image'
import WatchlistButton from './WatchlistButton'
import CompareToggle from './CompareToggle'
import excImg    from '@/assests/img/machinery/machine-card-excavator-openpit.jpg'
import bullImg   from '@/assests/img/machinery/machine-card-bulldozer-field.jpg'
import loaderImg from '@/assests/img/machinery/machine-card-wheel-loader-gravel.jpg'
import graderImg from '@/assests/img/machinery/machine-card-motor-grader-road.jpg'
import truckImg  from '@/assests/img/machinery/freight-port-crane-containers.jpg'
import compactorImg from '@/assests/img/machinery/yard-operations-aerial-storage.jpg'

const CATEGORY_IMAGES: Record<string, typeof excImg> = {
  'Excavator':        excImg,
  'Bulldozer':        bullImg,
  'Wheel Loader':     loaderImg,
  'Motor Grader':     graderImg,
  'Articulated Truck':truckImg,
  'Compactor':        compactorImg,
}

const STATUS_BADGE: Record<string, string> = {
  available:       'bg-emerald-500/20 border-emerald-500/30 text-emerald-400',
  pending_hold:    'bg-amber-500/20 border-amber-500/30 text-amber-400',
  reserved:        'bg-amber-500/20 border-amber-500/30 text-amber-400',
  payment_pending: 'bg-orange-500/20 border-orange-500/30 text-orange-400',
  sold:            'bg-red-500/20 border-red-500/30 text-red-400',
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

export default function MachineCard({
  machine,
  isWatchlisted = false,
  isInComparison = false,
  showActions = false,
  viewMode = 'grid',
}: {
  machine: Machine
  isWatchlisted?: boolean
  isInComparison?: boolean
  showActions?: boolean
  viewMode?: 'grid' | 'list'
}) {
  const categoryImg = CATEGORY_IMAGES[machine.category] ?? excImg
  const badgeCls = STATUS_BADGE[machine.status] ?? 'bg-white/10 border-white/15 text-white/60'
  const statusLabel = machine.status.replace(/_/g, ' ')

  /* ── LIST VIEW ── */
  if (viewMode === 'list') {
    return (
      <div className="group flex items-stretch bg-navy-900 border border-white/8 rounded-xl overflow-hidden hover:border-white/20 transition-all duration-200">
        {/* Gold accent left strip */}
        <div className="w-1 flex-shrink-0 bg-gold-400/20 group-hover:bg-gold-400/55 transition-colors duration-300" />

        <div className="flex-1 px-4 py-3.5 flex items-center gap-4 flex-wrap sm:flex-nowrap min-w-0">

          {/* Machine info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] text-white/35 uppercase tracking-widest">{machine.category}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${badgeCls}`}>
                {statusLabel}
              </span>
            </div>
            <h3 className="font-display font-bold text-white text-base truncate">
              {machine.brand} {machine.model}
            </h3>
            <p className="text-white/35 text-xs mt-0.5">
              {machine.year} · 📍 {machine.yard_city}, {machine.yard_country}
            </p>
          </div>

          {/* Stats */}
          <div className="flex gap-6 flex-shrink-0">
            <div>
              <p className="text-white/30 text-[10px] uppercase tracking-wider mb-0.5">Hours</p>
              <p className="text-white text-sm font-semibold">{machine.engine_hours.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-white/30 text-[10px] uppercase tracking-wider mb-0.5">Price</p>
              <p className="text-gold-400 text-sm font-bold">${Number(machine.price_usd).toLocaleString()}</p>
            </div>
          </div>

          {/* 150-pt badge */}
          <span className="text-xs text-gold-500 font-semibold flex-shrink-0 hidden sm:block">✓ 150-Point</span>

          {/* Actions */}
          {showActions && (
            <div className="flex items-center gap-2 flex-shrink-0 sm:border-l sm:border-white/10 sm:pl-4">
              <WatchlistButton machineId={machine.id} initialWatchlisted={isWatchlisted} />
              <CompareToggle machineId={machine.id} initialInComparison={isInComparison} />
            </div>
          )}

          {/* View link */}
          <Link
            href={`/machines/${machine.id}`}
            className="bg-navy-800 hover:bg-navy-700 border border-white/10 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors duration-150 flex-shrink-0 whitespace-nowrap"
          >
            View →
          </Link>
        </div>
      </div>
    )
  }

  /* ── GRID VIEW ── */
  return (
    <div className="group relative h-80 rounded-xl overflow-hidden bg-navy-900 flex flex-col">

      {/* Category photo background */}
      <Image
        src={categoryImg}
        alt={machine.category}
        fill
        className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      />

      {/* Gradient overlay — bottom heavy so text is readable */}
      <div className="absolute inset-0 bg-gradient-to-t from-navy-950/97 via-navy-950/55 to-navy-950/10" />

      {/* Hover gold ring */}
      <div className="absolute inset-0 rounded-xl ring-inset ring-0 group-hover:ring-2 ring-gold-400/50 transition-all duration-300 pointer-events-none" />

      {/* Main link — covers the full card except the actions strip */}
      <Link href={`/machines/${machine.id}`} className="relative z-10 flex-1 flex flex-col justify-between p-4">

        {/* Top row: category + status badges */}
        <div className="flex items-start justify-between gap-2">
          <span className="text-[10px] text-white/55 bg-navy-950/65 backdrop-blur-sm border border-white/10 px-2.5 py-1 rounded-full uppercase tracking-wider">
            {machine.category}
          </span>
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase backdrop-blur-sm ${badgeCls}`}>
            {statusLabel}
          </span>
        </div>

        {/* Bottom info block */}
        <div>
          <h3 className="font-display text-lg font-bold text-white mb-0.5 leading-tight">
            {machine.brand} {machine.model}
          </h3>
          <p className="text-white/40 text-xs mb-3">{machine.year}</p>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-navy-950/65 backdrop-blur-sm rounded-lg px-3 py-2">
              <p className="text-white/35 text-[10px] uppercase tracking-wider mb-0.5">Engine Hours</p>
              <p className="text-white text-sm font-semibold">{machine.engine_hours.toLocaleString()} hrs</p>
            </div>
            <div className="bg-navy-950/65 backdrop-blur-sm rounded-lg px-3 py-2">
              <p className="text-white/35 text-[10px] uppercase tracking-wider mb-0.5">Price</p>
              <p className="text-gold-400 text-sm font-bold">${Number(machine.price_usd).toLocaleString()}</p>
            </div>
          </div>

          {/* Yard location + inspection badge */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/35">📍 {machine.yard_city}, {machine.yard_country}</span>
            <span className="text-gold-500 font-semibold">✓ 150-Point</span>
          </div>
        </div>
      </Link>

      {/* Actions bar — outside the Link so buttons are independently clickable */}
      {showActions && (
        <div className="relative z-20 border-t border-white/10 px-4 py-3 flex items-center justify-between bg-navy-950/70 backdrop-blur-sm">
          <WatchlistButton machineId={machine.id} initialWatchlisted={isWatchlisted} />
          <CompareToggle machineId={machine.id} initialInComparison={isInComparison} />
        </div>
      )}
    </div>
  )
}
