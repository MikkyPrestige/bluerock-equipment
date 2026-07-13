import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()

  const allowed = ['freight_estimate', 'final_freight_cost', 'customs_fee', 'total_amount', 'status', 'milestone_phase', 'payment_reference']
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  const { data, error } = await adminSupabase
    .from('quotes')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    // BR001 = enforce_quote_status_phase_consistency() rejecting a
    // milestone_phase value the quote's current status doesn't support yet
    // (supabase/migrations/20260713_quotes_status_phase_integrity_and_atomic_lock.sql,
    // tagged with USING ERRCODE in 20260713b_quotes_phase_exceeded_errcode.sql).
    // This is a legitimate rule being enforced, not a server error — tell the
    // admin what actually happened instead of a generic failure.
    if (error.code === 'BR001') {
      const { data: current } = await adminSupabase
        .from('quotes')
        .select('status')
        .eq('id', id)
        .single()
      const statusLabel = (current?.status ?? 'unknown').replace(/_/g, ' ')
      const phaseText = typeof body.milestone_phase === 'number' ? `Phase ${body.milestone_phase}` : 'This phase'
      return NextResponse.json(
        { error: `${phaseText} can't be set yet — the quote's status is still "${statusLabel}," which doesn't support it. Advance the status first.` },
        { status: 409 }
      )
    }
    console.error('[admin/quotes/patch]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ quote: data })
}
