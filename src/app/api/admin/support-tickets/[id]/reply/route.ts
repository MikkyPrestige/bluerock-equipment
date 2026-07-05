import { NextRequest, NextResponse, after } from 'next/server'
import { Resend } from 'resend'
import { adminSupabase } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import {
  SUPPORT_BUCKET,
  SUPPORT_FILE_MAX_BYTES,
  SUPPORT_FILE_MAX_COUNT,
  SUPPORT_ALLOWED_TYPES,
} from '@/lib/support'

async function adminGuard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.email === process.env.ADMIN_EMAIL ? user : null
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_')
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await adminGuard()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const formData = await request.formData()
  const message = (formData.get('message') as string | null)?.trim() ?? ''
  const files = formData.getAll('files').filter((f): f is File => f instanceof File && f.size > 0)

  if (!message && files.length === 0) {
    return NextResponse.json({ error: 'message or attachment required' }, { status: 400 })
  }
  if (files.length > SUPPORT_FILE_MAX_COUNT) {
    return NextResponse.json({ error: `Only ${SUPPORT_FILE_MAX_COUNT} attachments allowed per message` }, { status: 400 })
  }
  for (const file of files) {
    if (!SUPPORT_ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: `${file.name}: unsupported file type` }, { status: 400 })
    }
    if (file.size > SUPPORT_FILE_MAX_BYTES) {
      return NextResponse.json({ error: `${file.name}: exceeds ${SUPPORT_FILE_MAX_BYTES / (1024 * 1024)}MB limit` }, { status: 400 })
    }
  }

  const { data: ticket, error: ticketErr } = await adminSupabase
    .from('support_tickets')
    .select('id, subject, buyer_id, buyers(email, company_name)')
    .eq('id', id)
    .single()

  if (ticketErr || !ticket) {
    return NextResponse.json({ error: ticketErr?.message ?? 'Ticket not found' }, { status: 404 })
  }

  // Written into the buyer's own folder (not admin's), same as buyer-sent
  // attachments — the storage read policy scopes by buyer_id, so a file only
  // becomes visible to the buyer if it lives under their folder regardless
  // of who uploaded it. Uses the service-role client since admin's own
  // browser session can never satisfy that folder-ownership check.
  const uploadedPaths: string[] = []
  if (files.length > 0) {
    const folder = crypto.randomUUID()
    for (const file of files) {
      const path = `${ticket.buyer_id}/${folder}/${sanitizeFileName(file.name)}`
      const { error: uploadErr } = await adminSupabase.storage
        .from(SUPPORT_BUCKET)
        .upload(path, file, { contentType: file.type })
      if (uploadErr) {
        return NextResponse.json({ error: `Attachment upload failed: ${uploadErr.message}` }, { status: 500 })
      }
      uploadedPaths.push(path)
    }
  }

  const { error: insertErr } = await adminSupabase
    .from('support_messages')
    .insert({
      ticket_id: id,
      sender_type: 'admin',
      sender_id: admin.id,
      message,
      file_urls: uploadedPaths,
    })

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  // Replying always continues the conversation, regardless of prior status.
  await adminSupabase
    .from('support_tickets')
    .update({ status: 'replied', closed_by: null })
    .eq('id', id)

  // Schedule the email after the response is sent — the admin's status
  // update must never wait on Resend latency.
  after(async () => {
    const buyer = ticket.buyers as unknown as { email: string; company_name: string | null } | null
    if (!process.env.RESEND_API_KEY || !buyer?.email) return

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bluerock-equipment.vercel.app'
    const fromAddress = process.env.RESEND_FROM_EMAIL ?? 'BlueRock Equipment <onboarding@resend.dev>'

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/></head>
<body style="font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;max-width:560px;margin:0 auto;padding:32px 16px">
  <div style="background:#1a3a5c;padding:24px 32px;border-radius:8px 8px 0 0">
    <p style="font-size:20px;font-weight:700;color:#fff;margin:0">BlueRock Equipment</p>
    <p style="font-size:11px;color:#b8962e;margin:4px 0 0;letter-spacing:2px;text-transform:uppercase">Support Reply</p>
  </div>
  <div style="background:#fff;border:1px solid #dde3ea;border-top:none;padding:32px;border-radius:0 0 8px 8px">
    <p style="font-size:16px;font-weight:700;color:#1a3a5c;margin:0 0 16px">Re: ${ticket.subject}</p>
    <p style="font-size:14px;color:#4a4a4a;line-height:1.6;margin:0 0 24px;white-space:pre-line">${message || 'A new attachment was added to your ticket.'}</p>
    <a href="${siteUrl}/dashboard/support"
       style="display:inline-block;background:#1a3a5c;color:#fff;font-size:14px;font-weight:700;
              padding:12px 28px;border-radius:6px;text-decoration:none">
      View in Dashboard &rarr;
    </a>
  </div>
</body>
</html>`

    const resend = new Resend(process.env.RESEND_API_KEY)
    const { error: emailErr } = await resend.emails.send({
      from: fromAddress,
      to: buyer.email,
      subject: `Re: ${ticket.subject} — BlueRock Equipment Support`,
      html,
    })
    if (emailErr) console.error('[admin/support-tickets/reply] Resend error:', JSON.stringify(emailErr))
  })

  return NextResponse.json({ ok: true })
}
