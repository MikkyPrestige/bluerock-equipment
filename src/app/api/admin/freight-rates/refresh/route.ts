import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  // satisfy linter — body not needed but request is required by Next.js signature
  void request

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch all IDs then bulk-update updated_at
  const { data: rows } = await adminSupabase.from('freight_rates').select('id')
  if (!rows || rows.length === 0) return NextResponse.json({ updated: 0 })

  const now = new Date().toISOString()
  const { error } = await adminSupabase
    .from('freight_rates')
    .update({ updated_at: now })
    .in('id', rows.map(r => r.id))

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ updated: rows.length, refreshedAt: now })
}
