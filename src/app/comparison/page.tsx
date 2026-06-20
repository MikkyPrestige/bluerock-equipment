import { createClient } from '@/lib/supabase/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import Image from 'next/image'
import logo       from '@/assests/img/logo.jpg'
import excImg     from '@/assests/img/machinery/machine-card-excavator-openpit.jpg'
import bullImg    from '@/assests/img/machinery/machine-card-bulldozer-field.jpg'
import loaderImg  from '@/assests/img/machinery/machine-card-wheel-loader-gravel.jpg'
import graderImg  from '@/assests/img/machinery/machine-card-motor-grader-road.jpg'
import truckImg   from '@/assests/img/machinery/freight-port-crane-containers.jpg'
import compactorImg from '@/assests/img/machinery/yard-operations-aerial-storage.jpg'

/* ── Category → thumbnail image ── */
const CATEGORY_IMAGES: Record<string, typeof excImg> = {
  'Excavator':         excImg,
  'Bulldozer':         bullImg,
  'Wheel Loader':      loaderImg,
  'Motor Grader':      graderImg,
  'Articulated Truck': truckImg,
  'Compactor':         compactorImg,
}
function categoryImg(cat: unknown) {
  return CATEGORY_IMAGES[String(cat)] ?? excImg
}

/* ── Wear helpers ── */
const wearRank: Record<string, number> = {
  excellent: 0, good: 1, wear_detected: 2, needs_repair: 3,
}
const wearLabel: Record<string, string> = {
  excellent: 'Excellent', good: 'Good', wear_detected: 'Wear Detected', needs_repair: 'Needs Repair',
}
const wearColors: Record<string, string> = {
  excellent:    'text-emerald-400',
  good:         'text-blue-400',
  wear_detected:'text-amber-400',
  needs_repair: 'text-red-400',
}

function worstWearKey(wear: Record<string, string>): string {
  const vals = Object.values(wear ?? {})
  if (!vals.length) return ''
  return vals.reduce((a, b) => (wearRank[b] ?? 0) > (wearRank[a] ?? 0) ? b : a)
}
function worstWearLabel(wear: Record<string, string>): string {
  const key = worstWearKey(wear)
  return key ? (wearLabel[key] ?? key) : '—'
}

/* ── Spec row definitions ── */
type RowType = 'price' | 'hours' | 'wear' | 'default'
interface Row {
  key: string
  label: string
  type?: RowType
  fmt?: (v: unknown) => string
}

const ROWS: Row[] = [
  { key: 'category',            label: 'Category' },
  { key: 'year',                label: 'Year' },
  { key: 'engine_hours',        label: 'Engine Hours',       type: 'hours',
    fmt: v => v != null ? `${Number(v).toLocaleString()} hrs` : '—' },
  { key: 'price_usd',           label: 'Asking Price',       type: 'price',
    fmt: v => v != null ? `$${Number(v).toLocaleString()}` : '—' },
  { key: 'operating_weight_kg', label: 'Operating Weight',
    fmt: v => v != null ? `${Number(v).toLocaleString()} kg` : '—' },
  { key: 'engine_configuration',label: 'Engine Config' },
  { key: 'hours_since_service', label: 'Hrs Since Service',
    fmt: v => v != null ? `${Number(v).toLocaleString()} hrs` : '—' },
  { key: 'serial_number',       label: 'Serial Number' },
  { key: 'yard_location',       label: 'Yard Location' },
  { key: 'wear_summary',        label: 'Worst Wear',          type: 'wear' },
]

function getCellValue(m: Record<string, unknown>, row: Row): string {
  if (row.key === 'yard_location') return `${m.yard_city ?? ''}, ${m.yard_country ?? ''}`
  if (row.type === 'wear') return worstWearLabel(m.wear_analysis as Record<string, string> ?? {})
  if (row.fmt) return row.fmt(m[row.key])
  return m[row.key] != null ? String(m[row.key]) : '—'
}

function getCellClass(m: Record<string, unknown>, row: Row): string {
  if (row.type === 'price')  return 'text-gold-400 font-bold text-base'
  if (row.type === 'hours')  return 'text-white font-semibold'
  if (row.type === 'wear') {
    const key = worstWearKey(m.wear_analysis as Record<string, string> ?? {})
    return `font-semibold ${wearColors[key] ?? 'text-white/60'}`
  }
  return 'text-white/70'
}

function getRowBg(row: Row): string {
  if (row.type === 'price') return 'bg-gold-400/4'
  if (row.type === 'hours') return 'bg-white/2'
  return ''
}

/* ── Page ── */
export default async function ComparisonPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: watchlistItems } = await adminSupabase
    .from('watchlist')
    .select('machine_id, machines(*)')
    .eq('buyer_id', user.id)
    .eq('in_comparison', true)

  type MachineRow = Record<string, unknown>
  const machines = (watchlistItems ?? [])
    .map(w => w.machines as unknown as MachineRow)
    .filter(Boolean)

  /* Server Action — remove a machine from comparison */
  async function removeFromComparison(machineId: string, _: FormData) {
    'use server'
    const sb = await createClient()
    const { data: { user: u } } = await sb.auth.getUser()
    if (!u) return
    await adminSupabase
      .from('watchlist')
      .update({ in_comparison: false })
      .eq('buyer_id', u.id)
      .eq('machine_id', machineId)
    revalidatePath('/comparison')
  }

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col">

      {/* ── NAV ── */}
      <header className="bg-navy-950/96 backdrop-blur-md border-b border-white/8 px-6 py-4 sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Image src={logo} alt="BlueRock Equipment" className="h-9 w-auto object-contain invert opacity-90" />
          </Link>
          <div className="hidden sm:flex items-center gap-2 text-white/30 text-sm">
            <Link href="/machines" className="hover:text-white transition-colors duration-150">← Inventory</Link>
            <span>/</span>
            <span className="text-white/60">Comparison</span>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <Link href="/machines" className="text-sm text-white/40 hover:text-white sm:hidden transition-colors">← Back</Link>
          <Link href="/dashboard" className="text-sm text-white/40 hover:text-white transition-colors duration-150">Dashboard</Link>
        </div>
      </header>

      {/* ── PAGE TITLE BAR ── */}
      <div className="bg-navy-900 border-b border-white/8 px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-end justify-between gap-4">
          <div>
            <p className="text-xs text-gold-400 font-semibold uppercase tracking-widest mb-1.5">Side-by-Side Analysis</p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">Comparison Workbench</h1>
          </div>
          {machines.length > 0 && (
            <p className="text-white/35 text-sm flex-shrink-0">
              {machines.length} machine{machines.length !== 1 ? 's' : ''} selected
            </p>
          )}
        </div>
      </div>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8">

        {/* ── EMPTY STATE ── */}
        {machines.length === 0 ? (
          <div className="text-center py-28">
            <div className="text-white/10 text-7xl mb-6">⚖</div>
            <p className="text-white/50 text-base mb-2">Your comparison tray is empty.</p>
            <p className="text-white/30 text-sm mb-8 max-w-sm mx-auto">
              Browse inventory and click <span className="text-white/50 font-semibold">+ Compare</span> on any machine card to add it here.
            </p>
            <Link
              href="/machines"
              className="bg-gold-400 hover:bg-gold-300 text-navy-950 font-bold px-7 py-3 rounded text-sm transition-colors duration-150 shadow-lg shadow-black/30"
            >
              Browse Inventory
            </Link>
          </div>
        ) : (
          <>
            {/* ── MOBILE STACKED CARDS (< md) ── */}
            <div className="md:hidden flex flex-col gap-5">
              {machines.map(m => (
                <div key={m.id as string} className="bg-navy-900 border border-white/8 rounded-xl overflow-hidden">

                  {/* Photo header */}
                  <div className="relative h-36 overflow-hidden">
                    <Image
                      src={categoryImg(m.category)}
                      alt={String(m.category)}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-navy-950/40 to-navy-950/95" />
                    <div className="absolute bottom-0 inset-x-0 p-4">
                      <Link href={`/machines/${m.id}`}>
                        <h3 className="font-display font-bold text-white text-lg leading-tight">
                          {String(m.brand)} {String(m.model)}
                        </h3>
                        <p className="text-white/40 text-xs mt-0.5">{String(m.year)} · {String(m.category)}</p>
                      </Link>
                    </div>
                  </div>

                  {/* Spec rows */}
                  {ROWS.map(row => {
                    const val = getCellValue(m, row)
                    const cls = getCellClass(m, row)
                    return (
                      <div
                        key={row.key}
                        className={`flex items-center justify-between px-4 py-3 border-t border-white/6 ${getRowBg(row)}`}
                      >
                        <p className="text-white/35 text-xs uppercase tracking-wider flex-shrink-0 w-36">
                          {row.label}
                        </p>
                        <p className={`text-sm text-right ml-2 ${cls}`}>{val}</p>
                      </div>
                    )
                  })}

                  {/* Remove button */}
                  <form action={removeFromComparison.bind(null, m.id as string)}>
                    <button
                      type="submit"
                      className="w-full border-t border-white/8 py-3 text-xs text-white/25 hover:text-red-400 hover:bg-red-500/5 transition-all duration-150"
                    >
                      Remove from comparison ×
                    </button>
                  </form>
                </div>
              ))}
            </div>

            {/* ── DESKTOP TABLE (md+) ── */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-white/8">
              <table className="w-full text-sm border-collapse">

                {/* Machine headers */}
                <thead>
                  <tr className="border-b border-white/10">

                    {/* Sticky spec-label header cell */}
                    <th className="sticky left-0 z-20 bg-navy-800 px-5 py-5 text-left align-bottom w-44 border-r border-white/8">
                      <span className="text-[10px] font-bold text-white/35 uppercase tracking-widest">Specification</span>
                    </th>

                    {/* One column per machine */}
                    {machines.map(m => (
                      <th
                        key={m.id as string}
                        className="px-5 py-4 text-left min-w-[220px] align-top bg-navy-900"
                      >
                        {/* Thumbnail */}
                        <div className="relative h-20 w-full rounded-lg overflow-hidden mb-3 group">
                          <Image
                            src={categoryImg(m.category)}
                            alt={String(m.category)}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-navy-950/40" />
                        </div>

                        {/* Machine name */}
                        <Link href={`/machines/${m.id}`} className="group block">
                          <p className="font-display font-bold text-white text-base leading-tight group-hover:text-gold-300 transition-colors duration-150">
                            {String(m.brand)} {String(m.model)}
                          </p>
                          <p className="text-white/35 text-xs font-normal mt-0.5">
                            {String(m.year)} · {String(m.category)}
                          </p>
                        </Link>

                        {/* Remove */}
                        <form action={removeFromComparison.bind(null, m.id as string)} className="mt-2.5">
                          <button
                            type="submit"
                            className="text-[10px] text-white/20 hover:text-red-400 border border-white/10 hover:border-red-400/30 px-2.5 py-1 rounded-full transition-all duration-150"
                          >
                            Remove ×
                          </button>
                        </form>
                      </th>
                    ))}
                  </tr>
                </thead>

                {/* Spec rows */}
                <tbody>
                  {ROWS.map((row, i) => (
                    <tr
                      key={row.key}
                      className={`border-b border-white/5 last:border-0 group/row ${getRowBg(row)} ${!getRowBg(row) ? 'hover:bg-white/2' : ''} ${i % 2 === 0 ? '' : 'bg-white/[0.015]'}`}
                    >
                      {/* Sticky label cell */}
                      <td className="sticky left-0 z-10 bg-navy-800 border-r border-white/8 px-5 py-4 text-[10px] font-bold text-white/40 uppercase tracking-widest whitespace-nowrap">
                        {row.label}
                        {row.type === 'price' && (
                          <div className="w-1 h-3 rounded-full bg-gold-400/50 inline-block ml-2 mb-0.5 align-middle" />
                        )}
                        {row.type === 'hours' && (
                          <div className="w-1 h-3 rounded-full bg-white/30 inline-block ml-2 mb-0.5 align-middle" />
                        )}
                      </td>

                      {/* Value cells */}
                      {machines.map(m => {
                        const val = getCellValue(m, row)
                        const cls = getCellClass(m, row)
                        return (
                          <td key={m.id as string} className={`px-5 py-4 ${cls}`}>
                            {val}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── ADD ANOTHER MACHINE CTA ── */}
            {machines.length < 3 && (
              <div className="mt-6 flex items-center gap-4">
                <div className="flex-1 h-px bg-white/5" />
                <Link
                  href="/machines"
                  className="text-xs text-white/30 hover:text-gold-400 border border-white/10 hover:border-gold-400/30 px-4 py-2 rounded-full transition-all duration-150 whitespace-nowrap"
                >
                  + Add another machine ({machines.length}/3)
                </Link>
                <div className="flex-1 h-px bg-white/5" />
              </div>
            )}
          </>
        )}
      </main>

      {/* ── FOOTER ── */}
      <footer className="bg-navy-950 border-t border-white/5 py-8 px-6 mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <Link href="/">
              <Image src={logo} alt="BlueRock Equipment" className="h-8 w-auto object-contain invert opacity-75" />
            </Link>
            <p className="text-xs mt-1.5 text-white/20">Premium Direct-Sale Heavy Machinery</p>
          </div>
          <nav className="flex gap-5 text-xs text-white/30">
            <Link href="/machines"   className="hover:text-white transition-colors duration-150">Inventory</Link>
            <Link href="/dashboard"  className="hover:text-white transition-colors duration-150">Dashboard</Link>
            <Link href="/trust"      className="hover:text-white transition-colors duration-150">Trust Hub</Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
