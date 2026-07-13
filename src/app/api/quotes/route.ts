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

  // Machine-availability check, buyer-duplicate check, quote insert, and
  // machine lock all happen atomically inside create_quote_with_lock — see
  // supabase/migrations/20260713_quotes_status_phase_integrity_and_atomic_lock.sql.
  // Two concurrent requests for the same machine can no longer both pass a
  // stale availability check before either write lands.
  const { data: quote, error } = await adminSupabase
    .rpc('create_quote_with_lock', {
      p_buyer_id: user.id,
      p_machine_id: machine_id,
      p_port: port_of_discharge.trim(),
    })

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'You already have an active quote for this machine' }, { status: 409 })
    }
    if (error.message?.includes('Machine not found')) {
      return NextResponse.json({ error: 'Machine not found' }, { status: 404 })
    }
    if (error.message?.includes('Machine is not available')) {
      return NextResponse.json({ error: 'Machine is not currently available for quoting' }, { status: 409 })
    }
    console.error('[quotes/create]', error)
    return NextResponse.json({ error: 'Failed to create quote' }, { status: 500 })
  }

  return NextResponse.json({ quote }, { status: 201 })
}
