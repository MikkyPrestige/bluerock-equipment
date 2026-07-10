import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

async function adminGuard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.email === process.env.ADMIN_EMAIL ? user : null
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await adminGuard()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // .select().single() forces detection of a zero-row update (stale/bad id) —
  // without it, an update matching nothing still returns no error, so a no-op
  // would otherwise be reported back as a successful resolve.
  const { data: ticket, error } = await adminSupabase
    .from('support_tickets')
    .update({ status: 'resolved', closed_by: null })
    .eq('id', id)
    .select('id')
    .single()

  if (error || !ticket) {
    const notFound = error?.code === 'PGRST116' || !ticket
    return NextResponse.json(
      { error: notFound ? 'Ticket not found' : 'Something went wrong. Please try again.' },
      { status: notFound ? 404 : 500 }
    )
  }
  return NextResponse.json({ ok: true })
}
