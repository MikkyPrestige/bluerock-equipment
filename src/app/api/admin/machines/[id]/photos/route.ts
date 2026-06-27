import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

async function adminGuard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.email === process.env.ADMIN_EMAIL ? user : null
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await adminGuard()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const storagePath = `machines/${id}/${Date.now()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error } = await adminSupabase.storage
    .from('machine-media')
    .upload(storagePath, buffer, { contentType: file.type, upsert: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: { publicUrl } } = adminSupabase.storage
    .from('machine-media')
    .getPublicUrl(storagePath)

  return NextResponse.json({ url: publicUrl })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await adminGuard()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await params
  const body = await request.json() as { path?: string }
  if (!body.path) return NextResponse.json({ error: 'No path provided' }, { status: 400 })

  const { error } = await adminSupabase.storage
    .from('machine-media')
    .remove([body.path])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
