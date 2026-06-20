import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { buyer_id, machine_id, scheduled_at, technician, calendly_event_url } = body

  if (!buyer_id || !scheduled_at) {
    return NextResponse.json({ error: 'buyer_id and scheduled_at required' }, { status: 400 })
  }

  const { data, error } = await adminSupabase
    .from('walkthroughs')
    .insert({
      buyer_id,
      machine_id: machine_id || null,
      scheduled_at,
      technician: technician || null,
      calendly_event_url: calendly_event_url || null,
      status: 'scheduled',
    })
    .select()
    .single()

  if (error) {
    console.error('[walkthroughs/create]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ walkthrough: data }, { status: 201 })
}
