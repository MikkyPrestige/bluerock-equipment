import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const RENDER_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'https://bluerock-equipment.onrender.com'

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

  const payload = {
    inspectionDate,
    machine: {
      name: machine.name,
      brand: machine.brand,
      model: machine.model,
      year: machine.year,
      serialNumber: machine.serial_number,
      category: machine.category,
      useCase: machine.use_case,
      engineHours: machine.engine_hours,
      hoursSinceService: machine.hours_since_service,
      yardCity: machine.yard_city,
      yardCountry: machine.yard_country,
      wearAnalysis: machine.wear_analysis || {},
      description: machine.description,
    },
  }

  let pdfBuffer: ArrayBuffer
  try {
    const renderRes = await fetch(`${RENDER_URL}/api/pdf/inspection-report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(120_000),
    })
    if (!renderRes.ok) {
      const msg = await renderRes.text()
      console.error('[inspection-report] Render error:', msg)
      return NextResponse.json({ error: 'PDF generation failed' }, { status: 502 })
    }
    pdfBuffer = await renderRes.arrayBuffer()
  } catch (err) {
    console.error('[inspection-report] Fetch failed:', err)
    return NextResponse.json({ error: 'Render backend unreachable' }, { status: 503 })
  }

  const filePath = `${machine_id}/inspection-report.pdf`

  const { error: uploadErr } = await adminSupabase.storage
    .from('inspection-reports')
    .upload(filePath, new Uint8Array(pdfBuffer), {
      contentType: 'application/pdf',
      upsert: true,
    })

  if (uploadErr) {
    console.error('[inspection-report] Upload failed:', uploadErr)
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
