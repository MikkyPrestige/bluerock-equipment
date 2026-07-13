import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

// Delta Warning — Handbook 7.2, adapted: the Handbook's checkFreightDelta ran
// admin-side before PDF generation, but the actual gate the buyer flow needs
// is at acceptance time (this route), per the accept/revise task design.
// TODO(freight-estimator): freight_estimate is only ever real once the
// Ballpark Freight Estimator is wired to freight_rates (still unbuilt as of
// this change — see the Sprint 5/6 diagnostic). Until then freight_estimate
// is null on effectively every quote, so this check is a no-op in practice,
// not because the logic is wrong but because there is no original estimate
// to compare against yet. Do not "fix" that here — out of scope for this
// task. Revisit the 0.15 threshold and the null-baseline behavior once a
// real estimate is captured at quote-creation time.
function computeDeltaPercent(originalEstimate: number | null, finalCost: number | null): number | null {
  if (!originalEstimate || originalEstimate <= 0) return null
  if (finalCost === null) return null
  return Math.abs(finalCost - originalEstimate) / originalEstimate
}

const DELTA_THRESHOLD = 0.15

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const acknowledgeDelta = body?.acknowledgeDelta === true

  const { data: quote, error: fetchErr } = await adminSupabase
    .from('quotes')
    .select('id, buyer_id, status, freight_estimate, final_freight_cost, milestone_phase')
    .eq('id', id)
    .single()

  if (fetchErr || !quote) return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
  if (quote.buyer_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (quote.status !== 'invoice_generated') {
    return NextResponse.json({ error: 'This quote is not currently awaiting your review.' }, { status: 409 })
  }

  const { data: currentProforma } = await adminSupabase
    .from('documents')
    .select('id')
    .eq('quote_id', id)
    .eq('document_type', 'proforma')
    .is('superseded_at', null)
    .limit(1)
    .maybeSingle()

  if (!currentProforma) {
    return NextResponse.json({ error: 'No proforma invoice is available to accept yet.' }, { status: 409 })
  }

  const deltaPercent = computeDeltaPercent(quote.freight_estimate, quote.final_freight_cost)
  if (deltaPercent !== null && deltaPercent > DELTA_THRESHOLD && !acknowledgeDelta) {
    return NextResponse.json({
      requiresConfirmation: true,
      deltaPercent,
      originalEstimate: quote.freight_estimate,
      finalFreightCost: quote.final_freight_cost,
    })
  }

  const { data: updated, error: updateErr } = await adminSupabase
    .from('quotes')
    .update({ status: 'buyer_accepted', milestone_phase: 2, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('buyer_id', user.id)
    .eq('status', 'invoice_generated')
    .select('id, status, milestone_phase')
    .single()

  if (updateErr || !updated) {
    return NextResponse.json({ error: 'This quote is no longer awaiting your review. Please refresh.' }, { status: 409 })
  }

  return NextResponse.json({ ok: true, quote: updated })
}
