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

  const { data: quote, error } = await adminSupabase
    .from('quotes')
    .update({ status: 'sold', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'payment_confirmed')
    .select('id, status, machine_id')
    .single()

  if (error || !quote) {
    return NextResponse.json({ error: 'This quote is not currently at Payment Confirmed.' }, { status: 409 })
  }

  // The machine is the actual constrained inventory resource — once its
  // quote is genuinely sold, the machine must permanently leave the
  // available/pending_hold pool too, or it would otherwise sit at
  // pending_hold forever (as it has since create_quote_with_lock first
  // locked it) with no path back to 'available' and no signal that it's
  // gone for good. machines.status already has its own 'sold' value
  // (see machineStatusBadge in admin/waitlist and MachineCard), so this
  // reuses it rather than introducing anything new.
  await adminSupabase
    .from('machines')
    .update({ status: 'sold', updated_at: new Date().toISOString() })
    .eq('id', quote.machine_id)

  return NextResponse.json({ ok: true, quote })
}
