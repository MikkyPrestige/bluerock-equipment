import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

async function adminGuard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.email === process.env.ADMIN_EMAIL ? user : null
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await adminGuard()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const reason = typeof body?.reason === 'string' ? body.reason.trim() : ''

  if (!reason) {
    return NextResponse.json({ error: 'Please describe what was wrong with the submitted payment.' }, { status: 400 })
  }

  // Sends the quote back to buyer_accepted — the same status that let the
  // buyer submit payment in the first place, not a new "payment_rejected"
  // value. Distinguished from a fresh, never-submitted buyer_accepted quote
  // by payment_rejection_reason being set, the same way a superseded
  // document is told apart by superseded_at rather than a different type.
  // This is a same-rank move (both buyer_accepted and payment_pending rank
  // 2 as of 20260716_payment_flow.sql), so the status/phase trigger allows
  // it without a special case, mirroring the revision-request loop.
  const { data: quote, error } = await adminSupabase
    .from('quotes')
    .update({ status: 'buyer_accepted', payment_rejection_reason: reason, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'payment_pending')
    .select('id, status')
    .single()

  if (error || !quote) {
    return NextResponse.json({ error: 'This quote is not currently awaiting payment verification.' }, { status: 409 })
  }

  return NextResponse.json({ ok: true, quote })
}
