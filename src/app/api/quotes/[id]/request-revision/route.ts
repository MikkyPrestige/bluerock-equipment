import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const reason = typeof body?.reason === 'string' ? body.reason.trim() : ''

  if (!reason) {
    return NextResponse.json({ error: 'Please describe what needs to change.' }, { status: 400 })
  }

  const { data: quote, error: fetchErr } = await adminSupabase
    .from('quotes')
    .select('id, buyer_id, status, machine_id')
    .eq('id', id)
    .single()

  if (fetchErr || !quote) return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
  if (quote.buyer_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (quote.status !== 'invoice_generated') {
    return NextResponse.json({ error: 'This quote is not currently awaiting your review.' }, { status: 409 })
  }

  const { data: updated, error: updateErr } = await adminSupabase
    .from('quotes')
    .update({ status: 'revision_requested', revision_reason: reason, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('buyer_id', user.id)
    .eq('status', 'invoice_generated')
    .select('id, status')
    .single()

  if (updateErr || !updated) {
    return NextResponse.json({ error: 'This quote is no longer awaiting your review. Please refresh.' }, { status: 409 })
  }

  // Same admin-visibility pattern already used for multi-machine quote
  // requests (notifications table, sent_via: 'platform', no email) — this
  // project has no precedent for emailing admin on a quote-status change, so
  // this reuses the existing in-platform mechanism rather than introducing one.
  await adminSupabase.from('notifications').insert({
    buyer_id: user.id,
    type: 'quote_revision_requested',
    message: `Buyer requested a revision on quote PRF-${id.slice(0, 8).toUpperCase()}: "${reason}"`,
    sent_via: 'platform',
    sent_at: new Date().toISOString(),
  })

  return NextResponse.json({ ok: true })
}
