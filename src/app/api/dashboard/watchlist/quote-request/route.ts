import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { createClient }  from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { machine_ids } = await request.json()
  if (!Array.isArray(machine_ids) || machine_ids.length === 0) {
    return NextResponse.json({ error: 'machine_ids (non-empty array) required' }, { status: 400 })
  }

  const now = new Date().toISOString()

  /* Fetch buyer's preferred port */
  const { data: buyer } = await adminSupabase
    .from('buyers')
    .select('preferred_port_of_discharge')
    .eq('id', user.id)
    .single()

  const port = buyer?.preferred_port_of_discharge ?? ''

  /* Fetch machines */
  const { data: machines } = await adminSupabase
    .from('machines')
    .select('id, name, brand, model, status')
    .in('id', machine_ids)

  /* Check for existing active quotes (skip duplicates) */
  const { data: existingQuotes } = await adminSupabase
    .from('quotes')
    .select('machine_id')
    .eq('buyer_id', user.id)
    .in('machine_id', machine_ids)
    .in('status', ['pending_quote', 'invoice_generated', 'revision_requested', 'buyer_accepted', 'payment_pending', 'payment_confirmed'])

  const alreadyQuoted = new Set((existingQuotes ?? []).map(q => q.machine_id as string))

  const lockExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()

  /* Only process available machines with no active quote */
  const eligible = (machines ?? []).filter(m =>
    m.status === 'available' && !alreadyQuoted.has(m.id)
  )

  let insertedCount = 0
  if (eligible.length > 0) {
    const { data: inserted, error: insertErr } = await adminSupabase
      .from('quotes')
      .insert(
        eligible.map(m => ({
          buyer_id:          user.id,
          machine_id:        m.id,
          status:            'pending_quote',
          port_of_discharge: port,
          freight_estimate:  0,
          lock_expires_at:   lockExpiresAt,
          milestone_phase:   0,
          created_at:        now,
        }))
      )
      .select('id')

    if (insertErr) {
      console.error('[quote-request/insert]', insertErr)
      return NextResponse.json({ error: 'Failed to create quotes' }, { status: 500 })
    }

    insertedCount = inserted?.length ?? 0

    /* Update machine statuses to pending_hold */
    await adminSupabase
      .from('machines')
      .update({ status: 'pending_hold', updated_at: now })
      .in('id', eligible.map(m => m.id))
  }

  /* Notification row for admin visibility */
  const nameList = (machines ?? [])
    .map(m => m.name || `${m.brand} ${m.model}`)
    .join(', ')

  await adminSupabase.from('notifications').insert({
    buyer_id: user.id,
    type:     'multi_machine_quote_request',
    message:  `Buyer requested quotes for ${machine_ids.length} machine${machine_ids.length > 1 ? 's' : ''}: ${nameList}`,
    sent_via: 'platform',
    sent_at:  now,
  })

  return NextResponse.json({ ok: true, count: insertedCount })
}
