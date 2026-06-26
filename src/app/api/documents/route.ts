import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const quoteId    = searchParams.get('quote_id')
  const page       = Math.max(0, parseInt(searchParams.get('page')      ?? '0', 10) || 0)
  const pageSize   = Math.min(50, parseInt(searchParams.get('page_size') ?? '10', 10) || 10)
  const activeOnly = searchParams.get('active_only') === 'true'

  if (!quoteId) return NextResponse.json({ error: 'quote_id required' }, { status: 400 })

  /* Verify the quote belongs to this buyer */
  const { data: quote, error: qErr } = await adminSupabase
    .from('quotes')
    .select('id, buyer_id')
    .eq('id', quoteId)
    .single()

  if (qErr || !quote) return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
  if (quote.buyer_id !== user.id && user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const dataQuery  = adminSupabase
    .from('documents')
    .select('id, document_type, version, file_path, superseded_at, created_at')
    .eq('quote_id', quoteId)
    .order('document_type')
    .order('version', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1)

  const countQuery = adminSupabase
    .from('documents')
    .select('id', { count: 'exact', head: true })
    .eq('quote_id', quoteId)

  if (activeOnly) {
    dataQuery.is('superseded_at', null)
    countQuery.is('superseded_at', null)
  }

  const [{ data: documents }, { count }] = await Promise.all([dataQuery, countQuery])

  return NextResponse.json({ documents: documents ?? [], totalCount: count ?? 0 })
}
