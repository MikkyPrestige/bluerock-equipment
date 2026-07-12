import http from 'http'
import puppeteer from 'puppeteer-core'
import chromium from '@sparticuz/chromium-min'
import { createClient } from '@supabase/supabase-js'

const PORT = process.env.PORT || 3001
const IS_PROD = process.env.NODE_ENV === 'production'

// This client bypasses RLS — only used server-side to fetch/write PDF-related data
const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function escHtml(str) {
  if (str == null) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function fmtUsd(amount) {
  const n = Number(amount)
  if (!n) return 'TBD'
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/* Ported verbatim from src/app/api/pdf/proforma-invoice/route.ts (buildProformaHTML) — that
   route was the tested, production-fitted source of truth. Keep this in sync with it by hand
   if the template ever changes; there is no shared module across the Vercel/Render boundary. */
function buildProformaHTML(d) {
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

function wearStyle(status) {
  const map = {
    excellent:     { text: '#15803d', bg: '#dcfce7', label: 'Excellent' },
    good:          { text: '#1d4ed8', bg: '#dbeafe', label: 'Good' },
    wear_detected: { text: '#b45309', bg: '#fef3c7', label: 'Wear Detected' },
    needs_repair:  { text: '#b91c1c', bg: '#fee2e2', label: 'Needs Repair' },
  }
  return map[status] ?? { text: '#6c757d', bg: '#f3f4f6', label: status }
}

function overallAssessment(wear) {
  const vals = Object.values(wear)
  if (!vals.length)                  return { label: 'Pending Inspection',  text: '#6c757d', bg: '#f3f4f6' }
  if (vals.includes('needs_repair')) return { label: 'Requires Attention',  text: '#b91c1c', bg: '#fee2e2' }
  if (vals.includes('wear_detected')) return { label: 'Wear Detected',      text: '#b45309', bg: '#fef3c7' }
  if (vals.every(s => s === 'excellent')) return { label: 'Excellent Condition', text: '#15803d', bg: '#dcfce7' }
  return { label: 'Good Condition', text: '#1d4ed8', bg: '#dbeafe' }
}

/* Ported verbatim from src/app/api/pdf/inspection-report/route.ts (buildInspectionHTML) —
   operates on the raw machines row exactly as that route did. Keep in sync by hand. */
function buildInspectionHTML(machine, inspectionDate) {
  const wear = machine.wear_analysis || {}
  const overall = overallAssessment(wear)

  const wearRows = Object.entries(wear).map(([component, status]) => {
    const s = wearStyle(status)
    const label = component.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    return `<tr>
      <td class="comp">${escHtml(label)}</td>
      <td><span class="badge" style="color:${s.text};background:${s.bg}">${s.label}</span></td>
    </tr>`
  }).join('')

  const name  = escHtml(machine.name  || `${machine.year} ${machine.brand} ${machine.model}`)
  const brand = escHtml(machine.brand)
  const model = escHtml(machine.model)
  const year  = escHtml(machine.year)

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;background:#fff;font-size:13px}
.hdr{background:#1a3a5c;padding:24px 36px;display:flex;justify-content:space-between;align-items:flex-start}
.logo{font-size:22px;font-weight:700;color:#fff;letter-spacing:-0.5px}
.logo-sub{font-size:10px;color:#b8962e;margin-top:4px;letter-spacing:2px;text-transform:uppercase}
.badge-150{background:#b8962e;color:#fff;font-size:11px;font-weight:700;padding:6px 14px;border-radius:20px;letter-spacing:0.5px;text-align:right}
.badge-150 small{display:block;font-size:9px;font-weight:400;margin-top:2px;letter-spacing:1px;text-transform:uppercase;opacity:.85}
.id-block{background:#f5f7fa;border-bottom:3px solid #b8962e;padding:20px 36px;display:flex;gap:0}
.id-main{flex:2;border-right:1px solid #dde3ea;padding-right:32px}
.id-meta{flex:1;padding-left:32px;display:grid;grid-template-columns:1fr 1fr;gap:12px}
.machine-title{font-size:20px;font-weight:700;color:#1a3a5c;margin-bottom:4px}
.machine-sub{font-size:12px;color:#6c757d}
.meta-label{font-size:9px;font-weight:700;color:#6c757d;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:3px}
.meta-val{font-size:13px;font-weight:600;color:#1a1a1a}
.overall{margin:24px 36px;border-radius:8px;padding:16px 20px;display:flex;align-items:center;gap:16px}
.overall-label{font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:3px}
.overall-val{font-size:17px;font-weight:700}
.wear-sec{padding:0 36px 24px}
.sec-title{font-size:9px;font-weight:700;color:#6c757d;letter-spacing:2px;text-transform:uppercase;margin-bottom:14px;padding-top:4px}
table.wear{width:100%;border-collapse:collapse}
.wear th{font-size:9px;color:#6c757d;text-transform:uppercase;letter-spacing:1px;padding:9px 14px;background:#f5f7fa;border-bottom:2px solid #dde3ea;text-align:left}
.wear td{padding:10px 14px;border-bottom:1px solid #f0f0f0}
.comp{font-weight:500;color:#1a1a1a}
.badge{font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;display:inline-block}
.desc-sec{padding:0 36px 24px}
.desc-text{font-size:12px;color:#4a4a4a;line-height:1.7;background:#f5f7fa;border-left:3px solid #b8962e;padding:14px 16px;border-radius:0 4px 4px 0}
.cert{background:#1a3a5c;padding:20px 36px;display:flex;justify-content:space-between;align-items:flex-end}
.cert-text{color:#8aacc8;font-size:11px;line-height:1.6;max-width:60%}
.stamp-box{border:2px solid #b8962e;border-radius:6px;padding:10px 20px;display:inline-block}
.stamp-top{font-size:9px;color:#b8962e;text-transform:uppercase;letter-spacing:1px}
.stamp-main{font-size:14px;font-weight:700;color:#fff;margin-top:2px}
.stamp-sub{font-size:9px;color:#8aacc8;margin-top:2px}
.footer{background:#0f2540;color:#8aacc8;padding:10px 36px;display:flex;justify-content:space-between;font-size:9px}
</style>
</head>
<body>

<div class="hdr">
  <div>
    <div class="logo">BlueRock Equipment</div>
    <div class="logo-sub">Premium Industrial Machinery</div>
  </div>
  <div style="text-align:right">
    <div class="badge-150">150-Point Inspection Report<small>Yard Inspection Completed</small></div>
    <div style="font-size:10px;color:#8aacc8;margin-top:8px">Inspection Date: ${escHtml(inspectionDate)}</div>
  </div>
</div>

<div class="id-block">
  <div class="id-main">
    <div class="machine-title">${name}</div>
    <div class="machine-sub">${escHtml(machine.category)}${machine.use_case ? ' &middot; ' + escHtml(machine.use_case) : ''}</div>
  </div>
  <div class="id-meta">
    <div><div class="meta-label">Brand</div><div class="meta-val">${brand}</div></div>
    <div><div class="meta-label">Model</div><div class="meta-val">${model}</div></div>
    <div><div class="meta-label">Year</div><div class="meta-val">${year}</div></div>
    ${machine.serial_number ? `<div><div class="meta-label">Serial No.</div><div class="meta-val">${escHtml(machine.serial_number)}</div></div>` : ''}
    <div><div class="meta-label">Engine Hours</div><div class="meta-val">${machine.engine_hours ? Number(machine.engine_hours).toLocaleString() + ' hrs' : 'N/A'}</div></div>
    ${machine.hours_since_service ? `<div><div class="meta-label">Hrs Since Service</div><div class="meta-val">${Number(machine.hours_since_service).toLocaleString()} hrs</div></div>` : ''}
    <div><div class="meta-label">Yard Location</div><div class="meta-val">${escHtml(machine.yard_city)}, ${escHtml(machine.yard_country)}</div></div>
  </div>
</div>

<div class="overall" style="background:${overall.bg};border:1px solid ${overall.text}22">
  <div>
    <div class="overall-label" style="color:${overall.text}">Overall Assessment</div>
    <div class="overall-val" style="color:${overall.text}">${escHtml(overall.label)}</div>
  </div>
  <div style="margin-left:auto;font-size:10px;color:#6c757d">${Object.keys(wear).length} components inspected</div>
</div>

${Object.keys(wear).length > 0 ? `
<div class="wear-sec">
  <div class="sec-title">Component Wear Analysis</div>
  <table class="wear">
    <thead><tr><th>Component</th><th>Condition Status</th></tr></thead>
    <tbody>${wearRows}</tbody>
  </table>
</div>` : ''}

${machine.description ? `
<div class="desc-sec">
  <div class="sec-title">Inspection Notes</div>
  <div class="desc-text">${escHtml(machine.description)}</div>
</div>` : ''}

<div class="cert">
  <div class="cert-text">
    This inspection report documents the physical condition of the listed equipment as assessed by
    BlueRock Equipment's yard inspection team. All component ratings reflect visual inspection and
    operational testing completed on the inspection date above. This report is valid for 90 days.
  </div>
  <div style="text-align:right">
    <div class="stamp-box">
      <div class="stamp-top">Certified By</div>
      <div class="stamp-main">BlueRock Equipment</div>
      <div class="stamp-sub">Yard Inspection Division</div>
    </div>
  </div>
</div>

<div class="footer">
  <span>BlueRock Equipment &middot; Yard Inspection Report &middot; ${name}</span>
  <span>Generated: ${escHtml(inspectionDate)}</span>
</div>

</body>
</html>`
}

// Must match the installed @sparticuz/chromium-min version — its pack format is tied to this tag.
const CHROMIUM_PACK_VERSION = 'v149.0.0'

// Sparticuz publishes architecture-suffixed pack files (e.g. chromium-v149.0.0-pack.x64.tar),
// never a bare "chromium-v149.0.0-pack.tar" — that filename 404s. process.arch maps 1:1 onto
// their suffixes ('x64' / 'arm64'), so build the URL from whatever this process is actually on
// rather than assuming Render's current x86_64 forever.
function defaultChromiumPackUrl() {
  const archSuffix = process.arch === 'arm64' ? 'arm64' : 'x64'
  return `https://github.com/Sparticuz/chromium/releases/download/${CHROMIUM_PACK_VERSION}/chromium-${CHROMIUM_PACK_VERSION}-pack.${archSuffix}.tar`
}

async function getChromePath() {
  if (!IS_PROD) {
    return process.env.LOCAL_CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  }
  // Primary path: Render's CHROMIUM_PATH points at the system Chromium installed via the build
  // command (apt-get install -y chromium-browser). This is checked first and returns immediately —
  // the download fallback below never runs when this is set.
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH
  // Fallback only: download the binary. Prefer a self-hosted fast URL via CHROMIUM_DOWNLOAD_URL;
  // the default below hits GitHub Releases directly, which is slow — acceptable as a last resort,
  // not as the primary path.
  const dlUrl = process.env.CHROMIUM_DOWNLOAD_URL || defaultChromiumPackUrl()
  return chromium.executablePath(dlUrl)
}

async function generatePDF(html) {
  let browser
  try {
    const executablePath = await getChromePath()
    browser = await puppeteer.launch(
      IS_PROD
        ? {
            args: chromium.args,
            defaultViewport: { width: 1100, height: 850 },
            executablePath,
            headless: true,
          }
        : {
            executablePath,
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            defaultViewport: { width: 1100, height: 850 },
          }
    )
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'domcontentloaded' })
    return await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    })
  } finally {
    if (browser) await browser.close()
  }
}

async function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', chunk => { raw += chunk })
    req.on('end', () => {
      try { resolve(JSON.parse(raw)) }
      catch { reject(new Error('Invalid JSON body')) }
    })
    req.on('error', reject)
  })
}

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}

// Verifies the bearer token against Supabase and returns the authenticated user, or null.
async function getAuthedUser(req) {
  const authHeader = req.headers['authorization'] || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return null
  const { data, error } = await adminSupabase.auth.getUser(token)
  if (error || !data?.user) return null
  return data.user
}

// Only the two PDF routes are called cross-origin (browser -> Render, from the admin UI).
// /health has no browser CORS caller (uptime monitors, server-to-server) and the pack of
// origins below is deliberately not applied globally — scoped per-route, set explicitly at
// the top of each PDF handler below.
const PDF_ROUTE_PATHS = new Set(['/api/pdf/inspection-report', '/api/pdf/proforma-invoice'])

// www.bluerockequipment.store is the canonical production origin — bluerockequipment.store
// (apex) 308-redirects to it, so the apex itself never actually appears as a fetch Origin,
// but it's listed too in case that redirect behavior ever changes. bluerock-equipment.vercel.app
// stays allowed since it's still live and reachable independent of the custom domain.
const PDF_ALLOWED_ORIGINS = new Set([
  'https://www.bluerockequipment.store',
  'https://bluerockequipment.store',
  'https://bluerock-equipment.vercel.app',
  'http://localhost:3000',
])

function applyPdfCors(req, res) {
  const origin = req.headers.origin
  if (origin && PDF_ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

const server = http.createServer(async (req, res) => {
  if (PDF_ROUTE_PATHS.has(req.url) && req.method === 'OPTIONS') {
    applyPdfCors(req, res)
    res.writeHead(204)
    res.end()
    return
  }

  if (
    (req.url === '/health' || req.url === '/health/') &&
    (req.method === 'GET' || req.method === 'HEAD')
  ) {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    // HEAD must not include a body, per HTTP semantics — headers/status only.
    res.end(req.method === 'GET' ? JSON.stringify({ status: 'ok', service: 'bluerock-backend' }) : undefined)
    return
  }

  if (req.url === '/api/pdf/inspection-report' && req.method === 'POST') {
    applyPdfCors(req, res)
    try {
      const user = await getAuthedUser(req)
      if (!user || user.email !== process.env.ADMIN_EMAIL) {
        sendJson(res, 401, { error: 'Unauthorized' })
        return
      }

      const { machine_id } = await readBody(req)
      if (!machine_id) { sendJson(res, 400, { error: 'machine_id required' }); return }

      const { data: machine, error: mErr } = await adminSupabase
        .from('machines')
        .select('*')
        .eq('id', machine_id)
        .single()

      if (mErr || !machine) { sendJson(res, 404, { error: 'Machine not found' }); return }

      const inspectionDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
      const html = buildInspectionHTML(machine, inspectionDate)
      const pdf = await generatePDF(html)

      const filePath = `${machine_id}/inspection-report.pdf`
      const { error: uploadErr } = await adminSupabase.storage
        .from('inspection-reports')
        .upload(filePath, pdf, { contentType: 'application/pdf', upsert: true })

      if (uploadErr) { console.error('[inspection-report] Upload error:', uploadErr); sendJson(res, 500, { error: 'Storage upload failed' }); return }

      const { data: urlData } = adminSupabase.storage
        .from('inspection-reports')
        .getPublicUrl(filePath)

      await adminSupabase
        .from('machines')
        .update({ inspection_report_url: urlData.publicUrl, updated_at: new Date().toISOString() })
        .eq('id', machine_id)

      sendJson(res, 200, { url: urlData.publicUrl })
    } catch (err) {
      console.error('[pdf/inspection-report]', err)
      sendJson(res, 500, { error: 'PDF generation failed', detail: err.message })
    }
    return
  }

  if (req.url === '/api/pdf/proforma-invoice' && req.method === 'POST') {
    applyPdfCors(req, res)
    try {
      const user = await getAuthedUser(req)
      if (!user) { sendJson(res, 401, { error: 'Unauthorized' }); return }

      const { quoteId } = await readBody(req)
      if (!quoteId) { sendJson(res, 400, { error: 'quoteId required' }); return }

      const { data: quote, error: qErr } = await adminSupabase
        .from('quotes')
        .select('*, machines(*), buyers(*)')
        .eq('id', quoteId)
        .single()

      if (qErr || !quote) { sendJson(res, 404, { error: 'Quote not found' }); return }

      const isAdmin = user.email === process.env.ADMIN_EMAIL
      if (!isAdmin && quote.buyer_id !== user.id) { sendJson(res, 403, { error: 'Forbidden' }); return }

      const m = quote.machines
      const b = quote.buyers
      const now = new Date()
      const fmtDate = (d) =>
        d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

      const machinePrice = Number(m.price_usd) || 0
      const freightEstimate = Number(quote.freight_estimate) || 0
      const customsFee = Number(quote.customs_fee) || 0
      const total = Number(quote.total_amount) || machinePrice

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
      const pdf = await generatePDF(html)

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

      if (uploadErr) { console.error('[proforma-invoice] Upload error:', uploadErr); sendJson(res, 500, { error: 'Storage upload failed' }); return }

      if (existing && existing.length > 0) {
        await adminSupabase
          .from('documents')
          .update({ superseded_at: now.toISOString() })
          .eq('id', existing[0].id)
      }

      const { data: insertedDoc, error: insertErr } = await adminSupabase.from('documents').insert({
        quote_id: quoteId,
        buyer_id: quote.buyer_id,
        document_type: 'proforma',
        file_path: filePath,
        version: nextVersion,
      }).select('id').single()

      if (insertErr) { console.error('[proforma-invoice] Insert error:', insertErr); sendJson(res, 500, { error: 'Document record failed' }); return }

      await adminSupabase
        .from('quotes')
        .update({ proforma_invoice_url: filePath, updated_at: now.toISOString() })
        .eq('id', quoteId)

      sendJson(res, 200, { filePath, documentId: insertedDoc.id })
    } catch (err) {
      console.error('[pdf/proforma-invoice]', err)
      sendJson(res, 500, { error: 'PDF generation failed', detail: err.message })
    }
    return
  }

  res.writeHead(404)
  res.end()
})

server.listen(PORT, () => {
  console.log(`BlueRock backend running on port ${PORT}`)
})
