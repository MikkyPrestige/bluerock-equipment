import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { SUPPORT_ALLOWED_TYPES, SUPPORT_FILE_MAX_BYTES } from '@/lib/support'

const EXT_BY_TYPE: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { data: quote, error: fetchErr } = await adminSupabase
    .from('quotes')
    .select('id, buyer_id, status')
    .eq('id', id)
    .single()

  if (fetchErr || !quote) return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
  if (quote.buyer_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (quote.status !== 'buyer_accepted') {
    return NextResponse.json({ error: 'This quote is not currently awaiting payment submission.' }, { status: 409 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const reference = (formData.get('payment_reference') as string | null)?.trim() ?? ''
  const file = formData.get('file') as File | null

  if (!reference) {
    return NextResponse.json({ error: 'Please enter your payment reference number.' }, { status: 400 })
  }
  if (!file || file.size === 0) {
    return NextResponse.json({ error: 'Please attach proof of payment (a slip or screenshot).' }, { status: 400 })
  }
  if (!SUPPORT_ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Only JPEG, PNG, WEBP, or PDF files are accepted.' }, { status: 400 })
  }
  if (file.size > SUPPORT_FILE_MAX_BYTES) {
    return NextResponse.json({ error: `File exceeds ${SUPPORT_FILE_MAX_BYTES / (1024 * 1024)}MB limit.` }, { status: 400 })
  }

  const buffer = new Uint8Array(await file.arrayBuffer())

  // Same versioning convention as the admin Document Ledger — supersede any
  // existing active payment_proof for this quote (a rejected submission's
  // proof stays on record, just no longer "current", exactly like a
  // superseded trade document).
  const { data: existing } = await adminSupabase
    .from('documents')
    .select('id, version')
    .eq('quote_id', id)
    .eq('document_type', 'payment_proof')
    .is('superseded_at', null)
    .order('version', { ascending: false })
    .limit(1)

  const nextVersion = existing && existing.length > 0 ? existing[0].version + 1 : 1
  const ext = EXT_BY_TYPE[file.type] ?? 'bin'
  const filePath = `${id}/payment_proof/v${nextVersion}.${ext}`
  const now = new Date().toISOString()

  const { error: uploadErr } = await adminSupabase.storage
    .from('documents')
    .upload(filePath, buffer, { contentType: file.type, upsert: false })

  if (uploadErr) {
    console.error('[quotes/payment] Upload error:', uploadErr)
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 })
  }

  if (existing && existing.length > 0) {
    await adminSupabase.from('documents').update({ superseded_at: now }).eq('id', existing[0].id)
  }

  const { error: insertErr } = await adminSupabase
    .from('documents')
    .insert({
      quote_id: id,
      buyer_id: quote.buyer_id,
      document_type: 'payment_proof',
      file_path: filePath,
      version: nextVersion,
    })

  if (insertErr) {
    console.error('[quotes/payment] Document insert error:', insertErr)
    return NextResponse.json({ error: 'Could not record the uploaded proof. Please try again.' }, { status: 500 })
  }

  const { data: updated, error: updateErr } = await adminSupabase
    .from('quotes')
    .update({
      payment_reference: reference,
      status: 'payment_pending',
      // Clears any note from a prior rejection — this submission is what
      // puts the quote back in front of admin, so an old reason must not
      // linger, same principle as clearing revision_reason on regenerate.
      payment_rejection_reason: null,
      updated_at: now,
    })
    .eq('id', id)
    .eq('buyer_id', user.id)
    .eq('status', 'buyer_accepted')
    .select('id, status')
    .single()

  if (updateErr || !updated) {
    return NextResponse.json({ error: 'This quote is no longer awaiting payment. Please refresh.' }, { status: 409 })
  }

  // Same admin-visibility pattern reused for the revision-request flow —
  // notifications table, sent_via: 'platform', no email precedent for
  // quote-status changes in this project.
  await adminSupabase.from('notifications').insert({
    buyer_id: user.id,
    type: 'payment_submitted',
    message: `Buyer submitted payment for quote PRF-${id.slice(0, 8).toUpperCase()} — reference: "${reference}"`,
    sent_via: 'platform',
    sent_at: now,
  })

  return NextResponse.json({ ok: true })
}
