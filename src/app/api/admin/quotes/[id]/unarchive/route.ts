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
    .update({ archived_at: null })
    .eq('id', id)
    .select('id, archived_at')
    .single()

  if (error || !quote) {
    const notFound = error?.code === 'PGRST116' || !quote
    return NextResponse.json(
      { error: notFound ? 'Quote not found' : 'Something went wrong. Please try again.' },
      { status: notFound ? 404 : 500 }
    )
  }

  return NextResponse.json({ ok: true, archived_at: quote.archived_at })
}
