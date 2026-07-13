import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { ACTIVE_QUOTE_STATUSES } from '@/lib/milestones'

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

  const { data: machine, error: machineErr } = await adminSupabase
    .from('machines')
    .select('id, status')
    .eq('id', id)
    .single()

  if (machineErr || !machine) return NextResponse.json({ error: 'Machine not found' }, { status: 404 })
  if (!['pending_hold', 'reserved'].includes(machine.status)) {
    return NextResponse.json({ error: 'This machine is not currently held.' }, { status: 409 })
  }

  // Not every held machine has a live quote — a buyer may have cancelled
  // from invoice_generated (or later) without the machine ever being
  // released, which is exactly the gap this view exists to fix. Only cancel
  // a quote if one is actually still active; otherwise this is purely a
  // machine-side release with nothing left to terminate.
  const { data: activeQuote } = await adminSupabase
    .from('quotes')
    .select('id, status')
    .eq('machine_id', id)
    .in('status', ACTIVE_QUOTE_STATUSES)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (activeQuote) {
    // activeQuote was just selected via .in(ACTIVE_STATUSES), so it's
    // already guaranteed non-terminal — no further defensive WHERE needed.
    await adminSupabase
      .from('quotes')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', activeQuote.id)
  }

  await adminSupabase
    .from('machines')
    .update({ status: 'available', updated_at: new Date().toISOString() })
    .eq('id', id)

  return NextResponse.json({ ok: true, releasedQuoteId: activeQuote?.id ?? null })
}
