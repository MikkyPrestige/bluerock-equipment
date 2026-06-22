import { NextRequest } from 'next/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { createClient }  from '@/lib/supabase/server'
import { generatePDF, generateScreenshot, escHtml } from '@/lib/pdf'

/* ── Status display ── */
const STATUS_STYLE: Record<string, { label: string; color: string }> = {
  available:    { label: 'Available',    color: '#15803d' },
  pending_hold: { label: 'Pending Hold', color: '#b45309' },
  reserved:     { label: 'Reserved',     color: '#1d4ed8' },
  sold:         { label: 'Sold',         color: '#dc2626' },
}

/* ── Wear analysis ── */
const WEAR_RANK:  Record<string, number> = { excellent: 0, good: 1, wear_detected: 2, needs_repair: 3 }
const WEAR_LABEL: Record<string, string> = { excellent: 'Excellent', good: 'Good', wear_detected: 'Wear Detected', needs_repair: 'Needs Repair' }
const WEAR_COLOR: Record<string, string> = { excellent: '#15803d', good: '#1d4ed8', wear_detected: '#b45309', needs_repair: '#dc2626' }

function worstWear(wear: Record<string, string> | null | undefined): { label: string; color: string } {
  if (!wear) return { label: '—', color: '#6b7280' }
  const vals = Object.values(wear)
  if (!vals.length) return { label: '—', color: '#6b7280' }
  const key = vals.reduce((a, b) => (WEAR_RANK[b] ?? 0) > (WEAR_RANK[a] ?? 0) ? b : a)
  return { label: WEAR_LABEL[key] ?? key, color: WEAR_COLOR[key] ?? '#6b7280' }
}

function fmt(v: unknown, suffix = ''): string {
  if (v == null || v === '') return '—'
  const n = Number(v)
  if (isNaN(n)) return escHtml(v)
  return suffix ? `${n.toLocaleString('en-US')} ${suffix}` : n.toLocaleString('en-US')
}

type CompMachine = {
  id: string
  name?: string | null
  brand: string
  model: string
  year: number
  category?: string | null
  engine_hours?: number | null
  price_usd?: number | null
  operating_weight_kg?: number | null
  engine_configuration?: string | null
  hours_since_service?: number | null
  serial_number?: string | null
  yard_city?: string | null
  yard_country?: string | null
  status?: string | null
  wear_analysis?: Record<string, string> | null
}

function buildComparisonHTML(
  machines: CompMachine[],
  companyName: string,
  exportDate: string,
  exportId: string,
): string {
  const cols    = machines.length
  const labelW  = '20%'
  const machW   = `${(80 / cols).toFixed(1)}%`

  const machineHeaders = machines.map(m => {
    const name = escHtml(m.name || `${m.brand} ${m.model}`)
    return `<th style="width:${machW};padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#d4a843;text-transform:uppercase;letter-spacing:0.5px;background:#0d1b2e;border-left:1px solid #1e3050">
      ${name}<br/><span style="font-size:9px;color:#8aacc8;font-weight:400;text-transform:none;letter-spacing:0">${escHtml(m.year)} &bull; ${escHtml(m.category ?? '')}</span>
    </th>`
  }).join('')

  type SpecRow = { label: string; render: (m: CompMachine) => string }
  const SPEC_ROWS: SpecRow[] = [
    { label: 'Category',         render: m => escHtml(m.category ?? '—') },
    { label: 'Year',             render: m => escHtml(m.year) },
    { label: 'Engine Hours',     render: m => fmt(m.engine_hours, 'hrs') },
    { label: 'Asking Price',     render: m => m.price_usd != null
        ? `<strong style="color:#0d1b2e">$${Number(m.price_usd).toLocaleString('en-US')}</strong>`
        : '—' },
    { label: 'Operating Weight', render: m => fmt(m.operating_weight_kg, 'kg') },
    { label: 'Engine Config',    render: m => escHtml(m.engine_configuration ?? '—') },
    { label: 'Hrs Since Svc',    render: m => fmt(m.hours_since_service, 'hrs') },
    { label: 'Serial Number',    render: m => `<span style="font-family:monospace;font-size:11px">${escHtml(m.serial_number ?? '—')}</span>` },
    { label: 'Yard Location',    render: m => {
        const loc = [m.yard_city, m.yard_country].filter(Boolean).join(', ')
        return escHtml(loc || '—')
      }},
    { label: 'Status',           render: m => {
        const st = STATUS_STYLE[m.status ?? '']
        const label = st ? st.label : escHtml(m.status ?? '—')
        const color = st ? st.color : '#6b7280'
        return `<span style="color:${color};font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">${label}</span>`
      }},
    { label: 'Worst Wear',       render: m => {
        const w = worstWear(m.wear_analysis)
        return `<span style="color:${w.color};font-weight:600;font-size:11px">${escHtml(w.label)}</span>`
      }},
  ]

  const tbodyRows = SPEC_ROWS.map((row, i) => {
    const rowBg = i % 2 === 0 ? '#ffffff' : '#f8fafc'
    const cells = machines.map(m =>
      `<td style="padding:9px 12px;font-size:12px;color:#374151;border-left:1px solid #f3f4f6;background:${rowBg}">${row.render(m)}</td>`
    ).join('')
    return `<tr>
      <td style="padding:9px 12px;font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1px;background:${rowBg};border-right:1px solid #e5e7eb;white-space:nowrap">${row.label}</td>
      ${cells}
    </tr>`
  }).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,Helvetica,sans-serif;color:#374151;background:#fff;font-size:13px;line-height:1.5}
.hdr{background:#0d1b2e;padding:24px 36px;display:flex;justify-content:space-between;align-items:flex-end}
.brand{font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px}
.brand-sub{font-size:9px;color:#d4a843;margin-top:4px;letter-spacing:2.5px;text-transform:uppercase}
.doc-type{text-align:right}
.doc-type-label{font-size:9px;color:#8aacc8;letter-spacing:1.5px;text-transform:uppercase}
.doc-type-title{font-size:16px;font-weight:700;color:#ffffff;margin-top:3px}
.buyer-bar{background:#f0f4f8;border-bottom:3px solid #d4a843;padding:14px 36px;display:flex;align-items:center;justify-content:space-between}
.prepared-label{font-size:9px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:3px}
.prepared-company{font-size:15px;font-weight:700;color:#0d1b2e}
.prepared-date{font-size:11px;color:#6b7280;margin-top:2px}
.count-box{text-align:right}
.count-num{font-size:24px;font-weight:700;color:#0d1b2e}
.count-label{font-size:9px;color:#6b7280;text-transform:uppercase;letter-spacing:1px}
.tbl-wrap{padding:24px 36px}
.tbl-title{font-size:9px;font-weight:700;color:#6b7280;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px}
table{width:100%;border-collapse:collapse;border:1px solid #e5e7eb;overflow:hidden}
.footer{background:#0d1b2e;padding:12px 36px;display:flex;justify-content:space-between;align-items:center;margin-top:4px}
.footer-left{font-size:9px;color:#8aacc8}
.footer-right{font-size:9px;color:#6b7280;text-align:right}
.export-id{font-family:monospace;font-size:8px;color:#4a5568;background:#f3f4f6;padding:2px 6px;border-radius:2px}
</style>
</head>
<body>

<div class="hdr">
  <div>
    <div class="brand">BlueRock Equipment</div>
    <div class="brand-sub">Premium Industrial Machinery</div>
  </div>
  <div class="doc-type">
    <div class="doc-type-label">Analysis Document</div>
    <div class="doc-type-title">Machine Comparison Report</div>
  </div>
</div>

<div class="buyer-bar">
  <div>
    <div class="prepared-label">Prepared For</div>
    <div class="prepared-company">${escHtml(companyName)}</div>
    <div class="prepared-date">${escHtml(exportDate)}</div>
  </div>
  <div class="count-box">
    <div class="count-num">${machines.length}</div>
    <div class="count-label">Machine${machines.length !== 1 ? 's' : ''} Compared</div>
  </div>
</div>

<div class="tbl-wrap">
  <div class="tbl-title">Side-by-Side Machine Comparison</div>
  <table>
    <thead>
      <tr>
        <th style="width:${labelW};padding:10px 12px;text-align:left;font-size:9px;font-weight:700;color:#8aacc8;text-transform:uppercase;letter-spacing:1.5px;background:#0d1b2e">Specification</th>
        ${machineHeaders}
      </tr>
    </thead>
    <tbody>
      ${tbodyRows}
    </tbody>
  </table>
</div>

<div class="footer">
  <div class="footer-left">
    BlueRock Equipment &mdash; Premium Direct-Sale Heavy Machinery &mdash; bluerockequipment.com
  </div>
  <div class="footer-right">
    <div>Generated: ${escHtml(exportDate)}</div>
    <div class="export-id">${escHtml(exportId)}</div>
  </div>
</div>

</body>
</html>`
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { searchParams } = new URL(request.url)
  const format     = searchParams.get('format') === 'png' ? 'png' : 'pdf'
  const machineIds = (searchParams.get('machines') ?? '').split(',').map(s => s.trim()).filter(Boolean)

  if (machineIds.length === 0) {
    return new Response('No machine IDs provided', { status: 400 })
  }

  /* ── Fetch data ── */
  const [{ data: buyer }, { data: rawMachines }] = await Promise.all([
    adminSupabase.from('buyers').select('company_name').eq('id', user.id).single(),
    adminSupabase
      .from('machines')
      .select('id, name, brand, model, year, category, engine_hours, price_usd, operating_weight_kg, engine_configuration, hours_since_service, serial_number, yard_city, yard_country, status, wear_analysis')
      .in('id', machineIds),
  ])

  const companyName = buyer?.company_name ?? user.email?.split('@')[0] ?? 'Buyer'
  const machines    = (rawMachines ?? []) as unknown as CompMachine[]

  const now         = new Date()
  const exportDate  = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const dateSlug    = now.toISOString().split('T')[0]
  const exportId    = `CMP-${now.getTime().toString(36).toUpperCase()}`
  const companySlug = companyName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20) || 'Buyer'
  const filename    = `BlueRock-Comparison-${companySlug}-${dateSlug}`

  const html = buildComparisonHTML(machines, companyName, exportDate, exportId)

  try {
    if (format === 'png') {
      const png = await generateScreenshot(html, 1200)
      return new Response(new Blob([png], { type: 'image/png' }), {
        headers: {
          'Content-Type':        'image/png',
          'Content-Disposition': `attachment; filename="${filename}.png"`,
        },
      })
    }

    const pdf = await generatePDF(html)
    return new Response(new Blob([pdf], { type: 'application/pdf' }), {
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}.pdf"`,
      },
    })
  } catch (err) {
    console.error('[comparison/export]', err)
    return new Response('Export generation failed', { status: 500 })
  }
}
