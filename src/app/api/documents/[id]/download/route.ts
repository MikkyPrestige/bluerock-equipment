import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { data: doc, error } = await adminSupabase
    .from('documents')
    .select('id, file_path, quote_id, quotes(buyer_id)')
    .eq('id', id)
    .single()

  if (error || !doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 })

  const quote = doc.quotes as unknown as { buyer_id: string } | null
  const isAdmin = user.email === process.env.ADMIN_EMAIL
  const isOwner = quote?.buyer_id === user.id

  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: signed, error: signErr } = await adminSupabase.storage
    .from('documents')
    .createSignedUrl(doc.file_path, 3600) // 1-hour URL for immediate download

  if (signErr || !signed) {
    return NextResponse.json({ error: 'Could not generate download link' }, { status: 500 })
  }

  return NextResponse.json({ url: signed.signedUrl })
}
