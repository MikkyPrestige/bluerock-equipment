import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { SUPPORT_BUCKET } from '@/lib/support'

async function adminGuard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.email === process.env.ADMIN_EMAIL ? user : null
}

export async function POST(request: NextRequest) {
  const admin = await adminGuard()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { path } = await request.json()
  if (!path) return NextResponse.json({ error: 'path required' }, { status: 400 })

  const { data, error } = await adminSupabase.storage
    .from(SUPPORT_BUCKET)
    .createSignedUrl(path, 300)

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Could not generate link' }, { status: 500 })
  }

  return NextResponse.json({ url: data.signedUrl })
}
