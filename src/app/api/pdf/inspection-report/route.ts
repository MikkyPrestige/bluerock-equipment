import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { generatePDF, escHtml } from '@/lib/pdf'

function wearStyle(status: string) {
  const map: Record<string, { text: string; bg: string; label: string }> = {
    excellent:     { text: '#15803d', bg: '#dcfce7', label: 'Excellent' },
    good:          { text: '#1d4ed8', bg: '#dbeafe', label: 'Good' },
    wear_detected: { text: '#b45309', bg: '#fef3c7', label: 'Wear Detected' },
    needs_repair:  { text: '#b91c1c', bg: '#fee2e2', label: 'Needs Repair' },
  }
  return map[status] ?? { text: '#6c757d', bg: '#f3f4f6', label: status }
}

function overallAssessment(wear: Record<string, string>) {
  const vals = Object.values(wear)
  if (!vals.length)                  return { label: 'Pending Inspection',  text: '#6c757d', bg: '#f3f4f6' }
  if (vals.includes('needs_repair')) return { label: 'Requires Attention',  text: '#b91c1c', bg: '#fee2e2' }
  if (vals.includes('wear_detected')) return { label: 'Wear Detected',      text: '#b45309', bg: '#fef3c7' }
  if (vals.every(s => s === 'excellent')) return { label: 'Excellent Condition', text: '#15803d', bg: '#dcfce7' }
  return { label: 'Good Condition', text: '#1d4ed8', bg: '#dbeafe' }
}

function buildInspectionHTML(machine: Record<string, unknown>, inspectionDate: string): string {
  const wear = (machine.wear_analysis as Record<string, string>) || {}
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

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { machine_id } = await request.json()
  if (!machine_id) return NextResponse.json({ error: 'machine_id required' }, { status: 400 })

  const { data: machine, error: mErr } = await adminSupabase
    .from('machines')
    .select('*')
    .eq('id', machine_id)
    .single()

  if (mErr || !machine) return NextResponse.json({ error: 'Machine not found' }, { status: 404 })

  const inspectionDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  let pdf: Uint8Array
  try {
    const html = buildInspectionHTML(machine, inspectionDate)
    pdf = await generatePDF(html)
  } catch (err) {
    console.error('[inspection-report] PDF error:', err)
    return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 })
  }

  const filePath = `${machine_id}/inspection-report.pdf`

  const { error: uploadErr } = await adminSupabase.storage
    .from('inspection-reports')
    .upload(filePath, pdf, { contentType: 'application/pdf', upsert: true })

  if (uploadErr) {
    console.error('[inspection-report] Upload error:', uploadErr)
    return NextResponse.json({ error: 'Storage upload failed' }, { status: 500 })
  }

  const { data: urlData } = adminSupabase.storage
    .from('inspection-reports')
    .getPublicUrl(filePath)

  await adminSupabase
    .from('machines')
    .update({ inspection_report_url: urlData.publicUrl, updated_at: new Date().toISOString() })
    .eq('id', machine_id)

  return NextResponse.json({ url: urlData.publicUrl })
}
