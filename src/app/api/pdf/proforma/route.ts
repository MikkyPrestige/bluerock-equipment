import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const RENDER_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'https://bluerock-equipment.onrender.com'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { quote_id } = body
  if (!quote_id) return NextResponse.json({ error: 'quote_id required' }, { status: 400 })

  const { data: quote, error: qErr } = await adminSupabase
    .from('quotes')
    .select('*, machines(*), buyers(*)')
    .eq('id', quote_id)
    .single()

  if (qErr || !quote) return NextResponse.json({ error: 'Quote not found' }, { status: 404 })

  const isAdmin = user.email === process.env.ADMIN_EMAIL
  if (!isAdmin && quote.buyer_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const m = quote.machines
  const b = quote.buyers

  const machinePrice = Number(m.price_usd) || 0
  const freightEst = Number(quote.freight_estimate) || 0
  const customsFee = Number(quote.customs_fee) || 0
  const total = Number(quote.total_amount) || (machinePrice + freightEst + customsFee)

  const now = new Date()
  const fmtDate = (d: Date) =>
    d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const issueDate = fmtDate(now)
  const validUntil = quote.lock_expires_at
    ? fmtDate(new Date(quote.lock_expires_at))
    : fmtDate(new Date(now.getTime() + 48 * 60 * 60 * 1000))

  const payload = {
    quoteId: quote.id,
    issueDate,
    validUntil,
    buyer: {
      name: b.email,
      company: b.company_name,
      address: b.corporate_address,
      portOfDischarge: quote.port_of_discharge || b.preferred_port_of_discharge,
    },
    machine: {
      name: `${m.year} ${m.brand} ${m.model}`,
      brand: m.brand,
      model: m.model,
      year: m.year,
      serialNumber: m.serial_number,
      engineHours: m.engine_hours,
      category: m.category,
    },
    pricing: { machinePrice, freightEstimate: freightEst, customsFee, total },
  }

  let pdfBuffer: ArrayBuffer
  try {
    const renderRes = await fetch(`${RENDER_URL}/api/pdf/proforma`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(120_000), // 2 min — accounts for Render cold start
    })
    if (!renderRes.ok) {
      const msg = await renderRes.text()
      console.error('[proforma] Render error:', msg)
      return NextResponse.json({ error: 'PDF generation failed' }, { status: 502 })
    }
    pdfBuffer = await renderRes.arrayBuffer()
  } catch (err) {
    console.error('[proforma] Fetch failed:', err)
    return NextResponse.json({ error: 'Render backend unreachable' }, { status: 503 })
  }

  // Determine next version and supersede existing active document
  const { data: existing } = await adminSupabase
    .from('documents')
    .select('id, version')
    .eq('quote_id', quote_id)
    .eq('document_type', 'proforma')
    .is('superseded_at', null)
    .order('version', { ascending: false })
    .limit(1)

  const nextVersion = existing && existing.length > 0 ? existing[0].version + 1 : 1
  const filePath = `proforma/${quote_id}/v${nextVersion}.pdf`

  const { error: uploadErr } = await adminSupabase.storage
    .from('documents')
    .upload(filePath, new Uint8Array(pdfBuffer), {
      contentType: 'application/pdf',
      upsert: false,
    })

  if (uploadErr) {
    console.error('[proforma] Upload failed:', uploadErr)
    return NextResponse.json({ error: 'Storage upload failed' }, { status: 500 })
  }

  if (existing && existing.length > 0) {
    await adminSupabase
      .from('documents')
      .update({ superseded_at: now.toISOString() })
      .eq('id', existing[0].id)
  }

  await adminSupabase.from('documents').insert({
    quote_id,
    buyer_id: quote.buyer_id,
    document_type: 'proforma',
    file_path: filePath,
    version: nextVersion,
  })

  await adminSupabase
    .from('quotes')
    .update({ proforma_invoice_url: filePath, updated_at: now.toISOString() })
    .eq('id', quote_id)

  const { data: signed } = await adminSupabase.storage
    .from('documents')
    .createSignedUrl(filePath, 60 * 60 * 24 * 7) // 7-day signed URL for immediate download

  return NextResponse.json({
    url: signed?.signedUrl,
    filePath,
    version: nextVersion,
  })
}
