import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { generatePDF, escHtml } from '@/lib/pdf'

function fmtUsd(amount: unknown): string {
  const n = Number(amount)
  if (!n) return 'TBD'
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

interface ProformaData {
  quoteId: string
  issueDate: string
  validUntil: string
  buyer: { company?: string; address?: string; portOfDischarge?: string }
  machine: {
    name?: string; brand: string; model: string; year: number
    serialNumber?: string; engineHours?: number; category?: string
  }
  pricing: { machinePrice: number; freightEstimate: number; customsFee: number; total: number }
}

function buildProformaHTML(d: ProformaData): string {
  const { quoteId, issueDate, validUntil, buyer, machine, pricing } = d
  const refId = quoteId.substring(0, 8).toUpperCase()
  const machineLine = escHtml(machine.name || `${machine.year} ${machine.brand} ${machine.model}`)

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;background:#fff;font-size:13px}
.hdr{background:#1a3a5c;color:#fff;padding:28px 36px;display:flex;justify-content:space-between;align-items:flex-start}
.logo{font-size:24px;font-weight:700;letter-spacing:-0.5px}
.logo-sub{font-size:10px;color:#b8962e;margin-top:4px;letter-spacing:2px;text-transform:uppercase}
.doc-info{text-align:right}
.doc-title{font-size:20px;font-weight:700;color:#b8962e;letter-spacing:1px}
.doc-num{font-size:12px;color:#8aacc8;margin-top:6px}
.doc-date{font-size:11px;color:#8aacc8;margin-top:3px}
.parties{display:flex;border-bottom:3px solid #b8962e}
.party{flex:1;padding:20px 36px}
.party-seller{background:#f5f7fa;border-right:1px solid #dde3ea}
.plabel{font-size:9px;font-weight:700;color:#6c757d;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px}
.pname{font-size:15px;font-weight:700;color:#1a3a5c;margin-bottom:4px}
.pdetail{font-size:12px;color:#4a4a4a;line-height:1.65}
.phighlight{color:#1a3a5c;font-weight:600}
.machine-sec{padding:24px 36px;background:#f5f7fa;border-bottom:1px solid #dde3ea}
.sec-title{font-size:9px;font-weight:700;color:#6c757d;letter-spacing:2px;text-transform:uppercase;margin-bottom:14px}
.machine-name{font-size:18px;font-weight:700;color:#1a3a5c;margin-bottom:14px}
.specs-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.spec{background:#fff;border:1px solid #dde3ea;border-radius:5px;padding:10px 14px}
.spec-label{font-size:9px;color:#6c757d;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px}
.spec-val{font-size:13px;font-weight:600;color:#1a1a1a}
.pricing-sec{padding:24px 36px}
table{width:100%;border-collapse:collapse}
thead th{text-align:left;font-size:9px;color:#6c757d;text-transform:uppercase;letter-spacing:1px;padding:10px 14px;background:#f5f7fa;border-bottom:2px solid #dde3ea}
thead th.ra{text-align:right}
tbody td{padding:13px 14px;border-bottom:1px solid #f0f0f0;vertical-align:top}
.desc{color:#1a1a1a;font-weight:500}
.note{font-size:10px;color:#6c757d;font-weight:400;margin-top:2px}
.amt{text-align:right;font-family:'Courier New',monospace;font-size:14px;color:#1a3a5c;font-weight:600;vertical-align:middle}
.total-row td{background:#1a3a5c;color:#fff;font-weight:700;font-size:14px}
.total-row .amt{color:#b8962e;font-size:16px}
.payment-bar{display:flex;background:#f5f7fa;border-top:1px solid #dde3ea;border-bottom:3px solid #1a3a5c}
.pblock{flex:1;padding:16px 36px;border-right:1px solid #dde3ea}
.pblock:last-child{border-right:none}
.pblabel{font-size:9px;font-weight:700;color:#6c757d;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px}
.pbval{font-size:12px;color:#1a3a5c;font-weight:600}
.pbsub{font-size:10px;color:#6c757d;margin-top:2px}
.terms{padding:18px 36px}
.term-title{font-size:9px;font-weight:700;color:#6c757d;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px}
.term-body{font-size:10px;color:#6c757d;line-height:1.8}
.sig-row{display:flex;padding:20px 36px;border-top:1px solid #dde3ea;gap:60px}
.sig-block{flex:1}
.sig-line{border-top:1px solid #1a1a1a;margin-top:36px;padding-top:8px}
.sig-role{font-size:10px;color:#6c757d}
.sig-name{font-size:12px;font-weight:700;color:#1a3a5c;margin-top:2px}
.footer{background:#1a3a5c;color:#8aacc8;padding:12px 36px;display:flex;justify-content:space-between;font-size:9px}
</style>
</head>
<body>

<div class="hdr">
  <div>
    <div class="logo">BlueRock Equipment</div>
    <div class="logo-sub">Premium Industrial Machinery</div>
  </div>
  <div class="doc-info">
    <div class="doc-title">PROFORMA INVOICE</div>
    <div class="doc-num">No. PRF-${escHtml(refId)}</div>
    <div class="doc-date">Issued: ${escHtml(issueDate)}</div>
    <div class="doc-date">Valid Until: ${escHtml(validUntil)}</div>
  </div>
</div>

<div class="parties">
  <div class="party party-seller">
    <div class="plabel">Seller</div>
    <div class="pname">BlueRock Equipment Ltd</div>
    <div class="pdetail">
      Direct-Sale Heavy Machinery Dealer<br/>
      <span class="phighlight">contact@bluerockequipment.com</span>
    </div>
  </div>
  <div class="party">
    <div class="plabel">Bill To</div>
    <div class="pname">${escHtml(buyer.company || 'Buyer')}</div>
    <div class="pdetail">
      ${buyer.address ? escHtml(buyer.address) + '<br/>' : ''}
      ${buyer.portOfDischarge ? `Port of Discharge: <span class="phighlight">${escHtml(buyer.portOfDischarge)}</span>` : ''}
    </div>
  </div>
</div>

<div class="machine-sec">
  <div class="sec-title">Equipment Description</div>
  <div class="machine-name">${machineLine}</div>
  <div class="specs-grid">
    <div class="spec"><div class="spec-label">Brand</div><div class="spec-val">${escHtml(machine.brand)}</div></div>
    <div class="spec"><div class="spec-label">Model</div><div class="spec-val">${escHtml(machine.model)}</div></div>
    <div class="spec"><div class="spec-label">Year</div><div class="spec-val">${escHtml(machine.year)}</div></div>
    ${machine.serialNumber ? `<div class="spec"><div class="spec-label">Serial No.</div><div class="spec-val">${escHtml(machine.serialNumber)}</div></div>` : ''}
    ${machine.engineHours ? `<div class="spec"><div class="spec-label">Engine Hours</div><div class="spec-val">${Number(machine.engineHours).toLocaleString()} hrs</div></div>` : ''}
    ${machine.category ? `<div class="spec"><div class="spec-label">Category</div><div class="spec-val">${escHtml(machine.category)}</div></div>` : ''}
  </div>
</div>

<div class="pricing-sec">
  <div class="sec-title">Pricing Breakdown</div>
  <table>
    <thead>
      <tr><th>Description</th><th class="ra">Amount (USD)</th></tr>
    </thead>
    <tbody>
      <tr>
        <td class="desc">
          ${escHtml(machine.year)} ${escHtml(machine.brand)} ${escHtml(machine.model)}
          <div class="note">Ex-yard &middot; ${escHtml(machine.category || '')}</div>
        </td>
        <td class="amt">${fmtUsd(pricing.machinePrice)}</td>
      </tr>
      <tr>
        <td class="desc">
          International Freight Estimate
          <div class="note">Subject to final carrier confirmation</div>
        </td>
        <td class="amt">${pricing.freightEstimate > 0 ? fmtUsd(pricing.freightEstimate) : '<span style="color:#9ca3af;font-size:12px">TBD</span>'}</td>
      </tr>
      <tr>
        <td class="desc">
          Import Duties &amp; Customs (Est.)
          <div class="note">Buyer&#39;s responsibility &mdash; destination-country rates apply</div>
        </td>
        <td class="amt">${pricing.customsFee > 0 ? fmtUsd(pricing.customsFee) : '<span style="color:#9ca3af;font-size:12px">TBD</span>'}</td>
      </tr>
      <tr class="total-row">
        <td class="desc">TOTAL ESTIMATED COST</td>
        <td class="amt">${fmtUsd(pricing.total)}</td>
      </tr>
    </tbody>
  </table>
</div>

<div class="payment-bar">
  <div class="pblock">
    <div class="pblabel">Payment Terms</div>
    <div class="pbval">Bank Wire Transfer (T/T)</div>
    <div class="pbsub">Letter of Credit accepted upon request</div>
  </div>
  <div class="pblock">
    <div class="pblabel">Port of Discharge</div>
    <div class="pbval">${escHtml(buyer.portOfDischarge || 'To be confirmed')}</div>
  </div>
  <div class="pblock">
    <div class="pblabel">Currency</div>
    <div class="pbval">USD &mdash; United States Dollar</div>
    <div class="pbsub">All amounts quoted in US Dollars</div>
  </div>
</div>

<div class="terms">
  <div class="term-title">Terms &amp; Conditions</div>
  <div class="term-body">
    1. This proforma invoice is valid for 48 hours from the issue date. Price and availability are subject to change after expiry.<br/>
    2. All prices are quoted FOB origin yard unless otherwise specified. Freight and customs estimates are indicative only.<br/>
    3. Payment must be received and confirmed before release of the Bill of Lading and export documentation.<br/>
    4. Risk of loss transfers to the buyer upon loading at the port of origin.<br/>
    5. Export documents (Bill of Lading, Export Certificate, Packing List, Customs Manifest) will be issued upon payment confirmation.<br/>
    6. This proforma invoice does not constitute a binding sales contract. A formal Sales Agreement will be issued upon deposit receipt.
  </div>
</div>

<div class="sig-row">
  <div class="sig-block">
    <div class="sig-line">
      <div class="sig-role">Authorized by &mdash; Seller</div>
      <div class="sig-name">BlueRock Equipment Ltd</div>
    </div>
  </div>
  <div class="sig-block">
    <div class="sig-line">
      <div class="sig-role">Acknowledged by &mdash; Buyer</div>
      <div class="sig-name">${escHtml(buyer.company || '')}</div>
    </div>
  </div>
</div>

<div class="footer">
  <span>BlueRock Equipment &middot; Premium Direct-Sale Heavy Machinery</span>
  <span>PRF-${escHtml(refId)} &middot; ${escHtml(issueDate)}</span>
</div>

</body>
</html>`
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { quoteId } = await request.json()
  if (!quoteId) return NextResponse.json({ error: 'quoteId required' }, { status: 400 })

  const { data: quote, error: qErr } = await adminSupabase
    .from('quotes')
    .select('*, machines(*), buyers(*)')
    .eq('id', quoteId)
    .single()

  if (qErr || !quote) return NextResponse.json({ error: 'Quote not found' }, { status: 404 })

  const isAdmin = user.email === process.env.ADMIN_EMAIL
  if (!isAdmin && quote.buyer_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const m = quote.machines
  const b = quote.buyers
  const now = new Date()
  const fmtDate = (d: Date) =>
    d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  const machinePrice = Number(m.price_usd) || 0
  const freightEstimate = Number(quote.freight_estimate) || 0
  const customsFee = Number(quote.customs_fee) || 0
  const total = Number(quote.total_amount) || machinePrice

  let pdf: Uint8Array
  try {
    const html = buildProformaHTML({
      quoteId,
      issueDate: fmtDate(now),
      validUntil: quote.lock_expires_at
        ? fmtDate(new Date(quote.lock_expires_at))
        : fmtDate(new Date(now.getTime() + 48 * 60 * 60 * 1000)),
      buyer: {
        company: b.company_name,
        address: b.corporate_address,
        portOfDischarge: quote.port_of_discharge || b.preferred_port_of_discharge,
      },
      machine: {
        name: m.name,
        brand: m.brand,
        model: m.model,
        year: m.year,
        serialNumber: m.serial_number,
        engineHours: m.engine_hours,
        category: m.category,
      },
      pricing: { machinePrice, freightEstimate, customsFee, total },
    })
    pdf = await generatePDF(html)
  } catch (err) {
    console.error('[proforma-invoice] PDF error:', err)
    return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 })
  }

  // Determine next version, supersede any existing active document
  const { data: existing } = await adminSupabase
    .from('documents')
    .select('id, version')
    .eq('quote_id', quoteId)
    .eq('document_type', 'proforma')
    .is('superseded_at', null)
    .order('version', { ascending: false })
    .limit(1)

  const nextVersion = existing && existing.length > 0 ? existing[0].version + 1 : 1
  const filePath = `proforma/${quoteId}/v${nextVersion}.pdf`

  const { error: uploadErr } = await adminSupabase.storage
    .from('documents')
    .upload(filePath, pdf, { contentType: 'application/pdf', upsert: false })

  if (uploadErr) {
    console.error('[proforma-invoice] Upload error:', uploadErr)
    return NextResponse.json({ error: 'Storage upload failed' }, { status: 500 })
  }

  if (existing && existing.length > 0) {
    await adminSupabase
      .from('documents')
      .update({ superseded_at: now.toISOString() })
      .eq('id', existing[0].id)
  }

  const { error: insertErr } = await adminSupabase.from('documents').insert({
    quote_id: quoteId,
    buyer_id: quote.buyer_id,
    document_type: 'proforma',
    file_path: filePath,
    version: nextVersion,
  })

  if (insertErr) {
    console.error('[proforma-invoice] Insert error:', insertErr)
    return NextResponse.json({ error: 'Document record failed' }, { status: 500 })
  }

  await adminSupabase
    .from('quotes')
    .update({ proforma_invoice_url: filePath, updated_at: now.toISOString() })
    .eq('id', quoteId)

  return NextResponse.json({ filePath })
}
