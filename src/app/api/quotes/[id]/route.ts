import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { ACTIVE_QUOTE_STATUSES } from '@/lib/milestones'

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { data: quote, error: fetchErr } = await adminSupabase
    .from('quotes')
    .select('id, buyer_id, status, machine_id')
    .eq('id', id)
    .single()

  if (fetchErr || !quote) return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
  if (quote.buyer_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Release the machine whenever cancelling from ANY status that still
  // holds it — not just pending_quote. REMOVABLE_STATUSES in QuotesCard
  // already lets a buyer cancel from invoice_generated, revision_requested,
  // and buyer_accepted too; checking only pending_quote here left the
  // machine stranded at pending_hold forever in exactly those cases — the
  // confirmed root cause behind three machines found stuck in production.
  // Mirrors the same ACTIVE_QUOTE_STATUSES check the admin Holds/Watchdog
  // release action uses.
  if ((ACTIVE_QUOTE_STATUSES as readonly string[]).includes(quote.status)) {
    const { data: machine } = await adminSupabase
      .from('machines')
      .select('id, status')
      .eq('id', quote.machine_id)
      .single()

    if (machine?.status === 'pending_hold' || machine?.status === 'reserved') {
      await adminSupabase
        .from('machines')
        .update({ status: 'available', updated_at: new Date().toISOString() })
        .eq('id', quote.machine_id)
    }
  }

  const { error: updateErr } = await adminSupabase
    .from('quotes')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', id)

  if (updateErr) {
    console.error('[quotes/cancel]', updateErr)
    return NextResponse.json({ error: 'Failed to cancel quote' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
