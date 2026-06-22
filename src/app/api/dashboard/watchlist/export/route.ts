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

type WatchlistMachine = {
  id: string
  name?: string
  brand: string
  model: string
  year: number
  category: string
  engine_hours?: number
  price_usd: number
  yard_city: string
  yard_country: string
  status: string
}

function buildWatchlistHTML(
  machines: WatchlistMachine[],
  companyName: string,
  exportDate: string,
  exportId: string,
): string {
  const rows = machines.map((m, i) => {
    const name     = escHtml(m.name || `${m.brand} ${m.model}`)
    const st       = STATUS_STYLE[m.status] ?? { label: escHtml(m.status), color: '#6b7280' }
    const rowBg    = i % 2 === 0 ? '#ffffff' : '#f8fafc'
    const price    = `$${Number(m.price_usd).toLocaleString('en-US')}`
    const hours    = m.engine_hours ? Number(m.engine_hours).toLocaleString() + ' hrs' : '—'
    const location = escHtml(`${m.yard_city}, ${m.yard_country}`)

    return `<tr style="background:${rowBg}">
      <td class="cell" style="font-weight:600;color:#0d1b2e">${name}</td>
      <td class="cell">${escHtml(m.year)}</td>
      <td class="cell">${escHtml(m.category)}</td>
      <td class="cell" style="font-variant-numeric:tabular-nums">${hours}</td>
      <td class="cell" style="font-weight:700;color:#0d1b2e;font-variant-numeric:tabular-nums">${price}</td>
      <td class="cell">${location}</td>
      <td class="cell"><span style="color:${st.color};font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">${st.label}</span></td>
    </tr>`
  }).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,Helvetica,sans-serif;color:#374151;background:#fff;font-size:13px;line-height:1.5}

/* Header */
.hdr{background:#0d1b2e;padding:28px 40px;display:flex;justify-content:space-between;align-items:flex-end}
.brand{font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.5px}
.brand-sub{font-size:10px;color:#d4a843;margin-top:5px;letter-spacing:2.5px;text-transform:uppercase}
.doc-type{text-align:right}
.doc-type-label{font-size:10px;color:#8aacc8;letter-spacing:1.5px;text-transform:uppercase}
.doc-type-title{font-size:18px;font-weight:700;color:#ffffff;margin-top:4px}

/* Buyer bar */
.buyer-bar{background:#f0f4f8;border-bottom:3px solid #d4a843;padding:16px 40px;display:flex;align-items:center;justify-content:space-between}
.prepared-label{font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:4px}
.prepared-company{font-size:16px;font-weight:700;color:#0d1b2e}
.prepared-date{font-size:12px;color:#6b7280;margin-top:2px}
.count-box{text-align:right}
.count-num{font-size:26px;font-weight:700;color:#0d1b2e}
.count-label{font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:1px}

/* Table */
.tbl-wrap{padding:28px 40px}
.tbl-title{font-size:10px;font-weight:700;color:#6b7280;letter-spacing:2px;text-transform:uppercase;margin-bottom:14px}
table{width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden}
thead tr{background:#0d1b2e}
thead th{padding:11px 14px;text-align:left;font-size:10px;font-weight:700;color:#d4a843;text-transform:uppercase;letter-spacing:1px;white-space:nowrap}
.cell{padding:11px 14px;font-size:12px;color:#374151;border-bottom:1px solid #f3f4f6}
tr:last-child .cell{border-bottom:none}

/* Footer */
.footer{background:#0d1b2e;padding:14px 40px;display:flex;justify-content:space-between;align-items:center;margin-top:auto}
.footer-left{font-size:10px;color:#8aacc8}
.footer-right{font-size:10px;color:#6b7280;text-align:right}
.export-id{font-family:monospace;font-size:9px;color:#4a5568;background:#f3f4f6;padding:2px 8px;border-radius:3px}

/* Empty state */
.empty{padding:60px 40px;text-align:center;color:#9ca3af;font-size:14px}
</style>
</head>
<body>

<div class="hdr">
  <div>
    <div class="brand">BlueRock Equipment</div>
    <div class="brand-sub">Premium Industrial Machinery</div>
  </div>
  <div class="doc-type">
    <div class="doc-type-label">Export Document</div>
    <div class="doc-type-title">Saved Machines List</div>
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
    <div class="count-label">Machine${machines.length !== 1 ? 's' : ''} Saved</div>
  </div>
</div>

<div class="tbl-wrap">
  <div class="tbl-title">Watchlist — All Saved Machines</div>
  ${machines.length === 0
    ? `<div class="empty">No machines in watchlist.</div>`
    : `<table>
      <thead>
        <tr>
          <th>Machine Name</th>
          <th>Year</th>
          <th>Category</th>
          <th>Engine Hours</th>
          <th>Price (USD)</th>
          <th>Yard Location</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`
  }
</div>

<div class="footer">
  <div class="footer-left">
    BlueRock Equipment &mdash; Direct-Sale Heavy Machinery &mdash; bluerockequipment.com
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
  const format = searchParams.get('format') === 'png' ? 'png' : 'pdf'

  /* ── Fetch data ── */
  const [{ data: buyer }, { data: watchlist }] = await Promise.all([
    adminSupabase.from('buyers').select('company_name').eq('id', user.id).single(),
    adminSupabase
      .from('watchlist')
      .select('machines(id, name, brand, model, year, category, engine_hours, price_usd, yard_city, yard_country, status)')
      .eq('buyer_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  const companyName = buyer?.company_name ?? user.email?.split('@')[0] ?? 'Buyer'
  const machines    = ((watchlist ?? []).map(w => w.machines).filter(Boolean)) as unknown as WatchlistMachine[]

  const now       = new Date()
  const exportDate = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const dateSlug   = now.toISOString().split('T')[0]
  const exportId   = `EXP-${now.getTime().toString(36).toUpperCase()}`
  const companySlug = companyName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20) || 'Buyer'
  const filename    = `BlueRock-Watchlist-${companySlug}-${dateSlug}`

  const html = buildWatchlistHTML(machines, companyName, exportDate, exportId)

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
    console.error('[watchlist/export]', err)
    return new Response('Export generation failed', { status: 500 })
  }
}
