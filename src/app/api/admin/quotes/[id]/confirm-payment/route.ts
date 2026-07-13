import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

async function adminGuard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.email === process.env.ADMIN_EMAIL ? user : null
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await adminGuard()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // Deliberately does not touch status beyond payment_confirmed — marking a
  // quote "sold" is a separate, distinct admin action (see mark-sold),
  // triggered independently, never an automatic consequence of confirming
  // payment.
  const { data: quote, error } = await adminSupabase
    .from('quotes')
    .update({ status: 'payment_confirmed', milestone_phase: 3, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'payment_pending')
    .select('id, status, milestone_phase')
    .single()

  if (error || !quote) {
    return NextResponse.json({ error: 'This quote is not currently awaiting payment verification.' }, { status: 409 })
  }

  return NextResponse.json({ ok: true, quote })
}
