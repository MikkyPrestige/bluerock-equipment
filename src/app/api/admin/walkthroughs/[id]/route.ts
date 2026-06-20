import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()

  const allowed = ['technician', 'status', 'admin_notes', 'scheduled_at', 'calendly_event_url']
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  const { data, error } = await adminSupabase
    .from('walkthroughs')
    .update(updates)
    .eq('id', id)
    .select('*, buyers(id)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Mirror admin_notes to buyers.walkthrough_notes so it shows in buyer management
  if ('admin_notes' in body && data?.buyers) {
    const b = data.buyers as unknown as { id: string }
    await adminSupabase
      .from('buyers')
      .update({ walkthrough_notes: body.admin_notes })
      .eq('id', b.id)
  }

  return NextResponse.json({ walkthrough: data })
}
