import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const MAX_COMPARISON = 3

async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await adminSupabase
    .from('watchlist')
    .select('id, machine_id, in_comparison, arrival_alert_params, created_at, machines(id, name, brand, model, year, category, price_usd, engine_hours, status, media_urls, yard_city, yard_country)')
    .eq('buyer_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ watchlist: data ?? [] })
}

export async function POST(request: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { machine_id } = await request.json()
  if (!machine_id) return NextResponse.json({ error: 'machine_id required' }, { status: 400 })

  // Upsert — no-op if already watchlisted
  const { data, error } = await adminSupabase
    .from('watchlist')
    .upsert({ buyer_id: user.id, machine_id }, { onConflict: 'buyer_id,machine_id', ignoreDuplicates: true })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data?.id }, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { machine_id } = await request.json()
  if (!machine_id) return NextResponse.json({ error: 'machine_id required' }, { status: 400 })

  const { error } = await adminSupabase
    .from('watchlist')
    .delete()
    .eq('buyer_id', user.id)
    .eq('machine_id', machine_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function PATCH(request: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { machine_id, in_comparison } = await request.json()
  if (!machine_id || typeof in_comparison !== 'boolean') {
    return NextResponse.json({ error: 'machine_id and in_comparison (boolean) required' }, { status: 400 })
  }

  // Enforce max 3 machines in comparison tray
  if (in_comparison) {
    const { count } = await adminSupabase
      .from('watchlist')
      .select('id', { count: 'exact', head: true })
      .eq('buyer_id', user.id)
      .eq('in_comparison', true)

    if ((count ?? 0) >= MAX_COMPARISON) {
      return NextResponse.json({ error: 'Comparison tray is full (max 3 machines)' }, { status: 409 })
    }
  }

  // Ensure watchlist row exists first
  await adminSupabase
    .from('watchlist')
    .upsert({ buyer_id: user.id, machine_id }, { onConflict: 'buyer_id,machine_id', ignoreDuplicates: true })

  const { error } = await adminSupabase
    .from('watchlist')
    .update({ in_comparison })
    .eq('buyer_id', user.id)
    .eq('machine_id', machine_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
