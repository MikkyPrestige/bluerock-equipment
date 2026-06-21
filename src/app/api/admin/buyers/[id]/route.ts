import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

async function adminGuard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.email === process.env.ADMIN_EMAIL ? user : null
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await adminGuard()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const [{ data: buyer, error }, { data: quotes }] = await Promise.all([
    adminSupabase.from('buyers').select('*').eq('id', id).single(),
    adminSupabase
      .from('quotes')
      .select('id, status, created_at')
      .eq('buyer_id', id)
      .order('created_at', { ascending: false }),
  ])

  if (error || !buyer) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const activity = {
    total_quotes:         quotes?.length ?? 0,
    purchases_completed:  quotes?.filter(q => q.status === 'sold').length ?? 0,
    last_activity:        quotes?.[0]?.created_at ?? null,
  }

  return NextResponse.json({ buyer, activity })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await adminGuard()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()

  const allowed = ['tier', 'kyc_verified', 'walkthrough_notes', 'preferred_port_of_discharge']
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { data, error } = await adminSupabase
    .from('buyers')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ buyer: data })
}
