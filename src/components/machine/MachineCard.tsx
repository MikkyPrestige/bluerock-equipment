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
  'Excavators':        excImg,
  'Bulldozers':        bullImg,
  'Wheel Loaders':     loaderImg,
  'Motor Graders':     graderImg,
  'Articulated Trucks':truckImg,
  /* legacy singular keys kept as fallback */
  'Excavator':        excImg,
  'Bulldozer':        bullImg,
  'Wheel Loader':     loaderImg,
  'Motor Grader':     graderImg,
  'Articulated Truck':truckImg,
  'Compactor':        compactorImg,
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

/** Returns the hero image src: first non-video item in media_urls, else category fallback. */
function heroSrc(mediaUrls: string[] | null | undefined, category: string): string | typeof excImg {
  const first = (mediaUrls ?? []).find(
    u => u && !u.includes('youtube') && !u.includes('youtu.be')
  )
  if (!first) return CATEGORY_IMAGES[category] ?? excImg
  if (first.startsWith('http')) return first
  return `${SUPABASE_URL}/storage/v1/object/public/machine-media/${first}`
}

const STATUS_BADGE: Record<string, string> = {
  available:       'bg-emerald-500/20 border-emerald-500/30 text-emerald-400',
  pending_hold:    'bg-amber-500/20 border-amber-500/30 text-amber-400',
  reserved:        'bg-amber-500/20 border-amber-500/30 text-amber-400',
  payment_pending: 'bg-orange-500/20 border-orange-500/30 text-orange-400',
  sold:            'bg-red-500/20 border-red-500/30 text-red-400',
}

const STATUS_LABEL: Record<string, string> = {
  available:       'Available',
  pending_hold:    'On Hold',
  reserved:        'Reserved',
  payment_pending: 'Paying',
  sold:            'Sold',
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
  const cardImg     = heroSrc(machine.media_urls, machine.category)
  const badgeCls    = STATUS_BADGE[machine.status] ?? 'bg-white/10 border-white/15 text-white/60'
  const statusLabel = STATUS_LABEL[machine.status] ?? machine.status.replace(/_/g, ' ')

  /* ── LIST VIEW ── */
  if (viewMode === 'list') {
    return (
      <div className="group flex items-stretch bg-navy-900 border border-white/8 rounded-xl overflow-hidden hover:border-white/20 transition-all duration-200">
        {/* Gold accent left strip */}
        <div className="w-1 flex-shrink-0 bg-gold-400/20 group-hover:bg-gold-400/55 transition-colors duration-300" />

        <div className="flex-1 px-4 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 min-w-0">

          {/* Machine info — full-width block on mobile, flex item on desktop */}
          <div className="min-w-0 sm:flex-1 sm:min-w-[220px]">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] text-white/35 uppercase tracking-widest truncate">{machine.category}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase flex-shrink-0 whitespace-nowrap ${badgeCls}`}>
                {statusLabel}
              </span>
            </div>
            <h3 className="font-display font-bold text-white text-base leading-snug sm:truncate">
              {machine.brand} {machine.model}
            </h3>
            <p className="text-white/35 text-xs mt-1.5 leading-relaxed">
              {machine.year} · 📍 {machine.yard_city}, {machine.yard_country}
            </p>
          </div>

          {/* Second row on mobile: stats + view link side by side */}
          <div className="flex items-center gap-4">

            {/* Stats */}
            <div className="flex gap-5 sm:gap-6 flex-1 sm:flex-none sm:flex-shrink-0">
              <div>
                <p className="text-white/30 text-[10px] uppercase tracking-wider mb-0.5">Hours</p>
                <p className="text-white text-sm font-semibold">{machine.engine_hours.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-white/30 text-[10px] uppercase tracking-wider mb-0.5">Price</p>
                <p className="text-gold-400 text-sm font-bold">${Number(machine.price_usd).toLocaleString()}</p>
              </div>
            </div>

            {/* 150-pt badge — desktop only */}
            <span className="text-xs text-gold-500 font-semibold flex-shrink-0 hidden sm:block">✓ 150-Point</span>

            {/* Actions */}
            {showActions && (
              <div className="flex items-center gap-2 flex-shrink-0 sm:border-l sm:border-white/10 sm:pl-4">
                <WatchlistButton machineId={machine.id} initialWatchlisted={isWatchlisted} />
                <CompareToggle machineId={machine.id} initialInComparison={isInComparison} />
              </div>
            )}

            {/* View link — ml-auto pushes it to the right edge on mobile */}
            <Link
              href={`/machines/${machine.id}`}
              className="bg-navy-800 hover:bg-navy-700 border border-white/10 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors duration-150 flex-shrink-0 whitespace-nowrap ml-auto sm:ml-0"
            >
              View →
            </Link>
          </div>
        </div>
      </div>
    )
  }

  /* ── GRID VIEW ── */
  return (
    <div className="group relative h-80 rounded-xl overflow-hidden bg-navy-900 flex flex-col">

      {/* Hero image — machine's own first photo, or category fallback */}
      <Image
        src={cardImg}
        alt={`${machine.brand} ${machine.model}`}
        fill
        className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      />

      {/* Gradient overlay — bottom heavy so text is readable */}
      <div className="absolute inset-0 bg-gradient-to-t from-navy-950/97 via-navy-950/55 to-navy-950/10" />

      {/* Hover gold ring */}
      <div className="absolute inset-0 rounded-xl ring-inset ring-0 group-hover:ring-2 ring-gold-400/50 transition-all duration-300 pointer-events-none" />

      {/* Category badge — top left */}
      <span className="absolute top-4 left-4 z-20 text-[10px] text-white/55 bg-navy-950/65 backdrop-blur-sm border border-white/10 px-2.5 py-1 rounded-full uppercase tracking-wider pointer-events-none">
        {machine.category}
      </span>

      {/* Status badge — top right */}
      <span className={`absolute top-4 right-4 z-20 text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase backdrop-blur-sm pointer-events-none ${badgeCls}`}>
        {statusLabel}
      </span>

      {/* Main link — covers the full card except the actions strip */}
      <Link href={`/machines/${machine.id}`} className="relative z-10 flex-1 flex flex-col justify-end p-4">

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
