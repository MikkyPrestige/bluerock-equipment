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

  // Machine-only change — the historical quote that led to the sale is
  // never touched, stays at status 'sold' with its own complete document
  // and payment history intact. There's no trigger on machines (the
  // status/phase consistency trigger lives on quotes) and this doesn't
  // interact with quotes_one_active_per_buyer_machine at all, since that
  // index is scoped to the quotes table, not machines.
  const { data: machine, error } = await adminSupabase
    .from('machines')
    .update({ status: 'available', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'sold')
    .select('id, status')
    .single()

  if (error || !machine) {
    return NextResponse.json({ error: 'This machine is not currently marked as sold.' }, { status: 409 })
  }

  return NextResponse.json({ ok: true, machine })
}
