import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

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

  /* If pending_quote, release machine back to available when it's still pending_hold */
  if (quote.status === 'pending_quote') {
    const { data: machine } = await adminSupabase
      .from('machines')
      .select('id, status')
      .eq('id', quote.machine_id)
      .single()

    if (machine?.status === 'pending_hold') {
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
