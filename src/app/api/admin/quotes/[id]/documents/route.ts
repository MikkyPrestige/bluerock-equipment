import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const ALLOWED_TYPES = ['bill_of_lading', 'export_cert', 'customs_manifest', 'packing_list']

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: quoteId } = await params

  const { data: quote, error: qErr } = await adminSupabase
    .from('quotes')
    .select('id, buyer_id')
    .eq('id', quoteId)
    .single()

  if (qErr || !quote) return NextResponse.json({ error: 'Quote not found' }, { status: 404 })

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const documentType = formData.get('document_type') as string
  const file = formData.get('file') as File | null

  if (!documentType || !ALLOWED_TYPES.includes(documentType)) {
    return NextResponse.json({ error: 'Invalid document_type' }, { status: 400 })
  }
  if (!file || file.size === 0) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }
  if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
    return NextResponse.json({ error: 'Only PDF files are accepted' }, { status: 400 })
  }

  const buffer = new Uint8Array(await file.arrayBuffer())

  // Determine version — supersede any existing active document of same type
  const { data: existing } = await adminSupabase
    .from('documents')
    .select('id, version')
    .eq('quote_id', quoteId)
    .eq('document_type', documentType)
    .is('superseded_at', null)
    .order('version', { ascending: false })
    .limit(1)

  const nextVersion = existing && existing.length > 0 ? existing[0].version + 1 : 1
  const filePath = `${quoteId}/${documentType}/v${nextVersion}.pdf`
  const now = new Date().toISOString()

  const { error: uploadErr } = await adminSupabase.storage
    .from('documents')
    .upload(filePath, buffer, { contentType: 'application/pdf', upsert: false })

  if (uploadErr) {
    console.error('[admin/documents] Upload error:', uploadErr)
    return NextResponse.json({ error: 'Storage upload failed' }, { status: 500 })
  }

  if (existing && existing.length > 0) {
    await adminSupabase
      .from('documents')
      .update({ superseded_at: now })
      .eq('id', existing[0].id)
  }

  const { data: inserted, error: insertErr } = await adminSupabase
    .from('documents')
    .insert({
      quote_id: quoteId,
      buyer_id: quote.buyer_id,
      document_type: documentType,
      file_path: filePath,
      version: nextVersion,
    })
    .select('id, version')
    .single()

  if (insertErr) {
    console.error('[admin/documents] Insert error:', insertErr)
    return NextResponse.json({ error: 'Document record failed' }, { status: 500 })
  }

  return NextResponse.json({ id: inserted.id, version: inserted.version, filePath }, { status: 201 })
}
