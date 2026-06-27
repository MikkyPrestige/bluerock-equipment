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
  const { data: machine, error } = await adminSupabase
    .from('machines')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !machine) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ machine })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await adminGuard()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body   = await request.json()

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (body.brand && body.model) {
    updates.name = `${body.brand} ${body.model}`
  }
  if ('brand'               in body) updates.brand               = body.brand
  if ('model'               in body) updates.model               = body.model
  if ('year'                in body) updates.year                = parseInt(body.year)
  if ('category'            in body) updates.category            = body.category
  if ('use_case'            in body) updates.use_case            = body.use_case
  if ('engine_hours'        in body) updates.engine_hours        = parseInt(body.engine_hours)
  if ('price_usd'           in body) updates.price_usd           = parseFloat(body.price_usd)
  if ('yard_country'        in body) updates.yard_country        = body.yard_country
  if ('yard_city'           in body) updates.yard_city           = body.yard_city
  if ('serial_number'       in body) updates.serial_number       = body.serial_number || null
  if ('operating_weight_kg' in body) updates.operating_weight_kg = body.operating_weight_kg ? parseFloat(body.operating_weight_kg) : null
  if ('video_url'           in body) updates.video_url           = body.video_url || null
  if ('status'              in body) updates.status              = body.status
  if ('wear_analysis'       in body) updates.wear_analysis       = body.wear_analysis
  if ('description'         in body) updates.description         = body.description || null
  if ('engine_configuration' in body) updates.engine_configuration = body.engine_configuration || null
  if ('hours_since_service' in body) updates.hours_since_service = body.hours_since_service ? parseInt(body.hours_since_service) : null
  if ('specs'               in body) updates.specs               = body.specs || {}
  if ('media_urls'          in body) updates.media_urls          = Array.isArray(body.media_urls) ? body.media_urls : []

  const { data, error } = await adminSupabase
    .from('machines')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ machine: data })
}
