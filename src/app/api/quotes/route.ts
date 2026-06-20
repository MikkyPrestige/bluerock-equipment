import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { machine_id, port_of_discharge } = await request.json()
  if (!machine_id) return NextResponse.json({ error: 'machine_id required' }, { status: 400 })
  if (!port_of_discharge?.trim()) return NextResponse.json({ error: 'port_of_discharge required' }, { status: 400 })

  const { data: machine } = await adminSupabase
    .from('machines')
    .select('id, status, name')
    .eq('id', machine_id)
    .single()

  if (!machine) return NextResponse.json({ error: 'Machine not found' }, { status: 404 })
  if (machine.status !== 'available') {
    return NextResponse.json({ error: 'Machine is not currently available for quoting' }, { status: 409 })
  }

  // Prevent duplicate active quotes from the same buyer for this machine
  const { data: existing } = await adminSupabase
    .from('quotes')
    .select('id')
    .eq('buyer_id', user.id)
    .eq('machine_id', machine_id)
    .in('status', ['pending_quote', 'invoice_generated', 'buyer_accepted', 'payment_pending', 'payment_confirmed'])
    .limit(1)

  if (existing && existing.length > 0) {
    return NextResponse.json({ error: 'You already have an active quote for this machine' }, { status: 409 })
  }

  const lock_expires_at = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()

  const { data: quote, error: qErr } = await adminSupabase
    .from('quotes')
    .insert({
      buyer_id: user.id,
      machine_id,
      status: 'pending_quote',
      port_of_discharge: port_of_discharge.trim(),
      lock_expires_at,
      milestone_phase: 0,
    })
    .select()
    .single()

  if (qErr) {
    console.error('[quotes/create]', qErr)
    return NextResponse.json({ error: 'Failed to create quote' }, { status: 500 })
  }

  await adminSupabase
    .from('machines')
    .update({ status: 'pending_hold', updated_at: new Date().toISOString() })
    .eq('id', machine_id)

  return NextResponse.json({ quote }, { status: 201 })
}
