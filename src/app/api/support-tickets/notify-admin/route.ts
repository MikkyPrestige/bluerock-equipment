import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { adminSupabase } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { messageId } = await request.json()
  if (!messageId) return NextResponse.json({ error: 'messageId required' }, { status: 400 })

  const { data: message, error } = await adminSupabase
    .from('support_messages')
    .select('id, message, ticket_id, support_tickets(id, subject, buyer_id, buyers(email, company_name))')
    .eq('id', messageId)
    .single()

  if (error || !message) return NextResponse.json({ error: 'Message not found' }, { status: 404 })

  const ticket = message.support_tickets as unknown as {
    id: string; subject: string; buyer_id: string
    buyers: { email: string; company_name: string | null } | null
  } | null

  if (!ticket || ticket.buyer_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const buyer = ticket.buyers
  const adminEmail = process.env.ADMIN_EMAIL
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bluerock-equipment.vercel.app'
  const ticketUrl = `${siteUrl}/admin/support/${ticket.id}`

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/></head>
<body style="font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;max-width:560px;margin:0 auto;padding:32px 16px">
  <div style="background:#1a3a5c;padding:24px 32px;border-radius:8px 8px 0 0">
    <p style="font-size:20px;font-weight:700;color:#fff;margin:0">BlueRock Equipment</p>
    <p style="font-size:11px;color:#b8962e;margin:4px 0 0;letter-spacing:2px;text-transform:uppercase">New Support Message</p>
  </div>
  <div style="background:#fff;border:1px solid #dde3ea;border-top:none;padding:32px;border-radius:0 0 8px 8px">
    <p style="font-size:16px;font-weight:700;color:#1a3a5c;margin:0 0 16px">${ticket.subject}</p>
    <p style="font-size:14px;color:#4a4a4a;line-height:1.6;margin:0 0 12px">
      From <strong>${buyer?.company_name || buyer?.email || 'a buyer'}</strong>
    </p>
    <p style="font-size:14px;color:#4a4a4a;line-height:1.6;margin:0 0 24px;white-space:pre-line">${message.message}</p>
    <a href="${ticketUrl}"
       style="display:inline-block;background:#1a3a5c;color:#fff;font-size:14px;font-weight:700;
              padding:12px 28px;border-radius:6px;text-decoration:none">
      Open Ticket &rarr;
    </a>
  </div>
</body>
</html>`

  if (!process.env.RESEND_API_KEY || !adminEmail) {
    console.warn('[support-tickets/notify-admin] RESEND_API_KEY or ADMIN_EMAIL not set — skipping email send')
    return NextResponse.json({ ok: true })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const fromAddress = process.env.RESEND_FROM_EMAIL ?? 'BlueRock Equipment <onboarding@resend.dev>'
  const { error: emailErr } = await resend.emails.send({
    from: fromAddress,
    to: adminEmail,
    subject: `New Support Message — ${ticket.subject}`,
    html,
  })

  if (emailErr) {
    console.error('[support-tickets/notify-admin] Resend error:', JSON.stringify(emailErr))
  }

  return NextResponse.json({ ok: true })
}
