import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  // Verify the requester is the admin
  const { data: { user } } = await (await createClient()).auth.getUser()

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  const { data, error } = await adminSupabase.from('machines').insert({
    name: `${body.brand} ${body.model}`,
    brand: body.brand,
    model: body.model,
    year: parseInt(body.year),
    category: body.category,
    use_case: body.use_case,
    engine_hours: parseInt(body.engine_hours),
    price_usd: parseFloat(body.price_usd),
    yard_country: body.yard_country,
    yard_city: body.yard_city,
    serial_number: body.serial_number || null,
    operating_weight_kg: body.operating_weight_kg ? parseFloat(body.operating_weight_kg) : null,
    video_url: body.video_url || null,
    status: body.status,
    wear_analysis: body.wear_analysis,
    description: body.description || null,
    engine_configuration: body.engine_configuration || null,
    hours_since_service: body.hours_since_service ? parseInt(body.hours_since_service) : null,
    specs: body.specs || {},
    media_urls: [],
  }).select().single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ machine: data })
}