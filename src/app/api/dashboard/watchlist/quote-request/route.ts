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

  /* Fetch machine names for the message */
  const { data: machines } = await adminSupabase
    .from('machines')
    .select('id, name, brand, model')
    .in('id', machine_ids)

  const nameList = (machines ?? [])
    .map(m => m.name || `${m.brand} ${m.model}`)
    .join(', ')

  await adminSupabase.from('notifications').insert({
    buyer_id:  user.id,
    type:      'multi_machine_quote_request',
    message:   `Buyer requested quotes for ${machine_ids.length} machine${machine_ids.length > 1 ? 's' : ''}: ${nameList}`,
    sent_via:  'platform',
    sent_at:   new Date().toISOString(),
  })

  return NextResponse.json({ ok: true, count: machine_ids.length })
}
