import { NextRequest, NextResponse, after } from 'next/server'
import { Resend } from 'resend'
import { adminSupabase } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

async function adminGuard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.email === process.env.ADMIN_EMAIL ? user : null
}

export async function POST(request: NextRequest) {
  const admin = await adminGuard()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { buyer_id, subject, message } = await request.json()
  if (!buyer_id || !subject?.trim()) {
    return NextResponse.json({ error: 'buyer_id and subject are required' }, { status: 400 })
  }

  const { data: buyer, error: buyerErr } = await adminSupabase
    .from('buyers')
    .select('id, email, company_name')
    .eq('id', buyer_id)
    .single()

  if (buyerErr || !buyer) {
    const notFound = buyerErr?.code === 'PGRST116' || !buyer
    return NextResponse.json(
      { error: notFound ? 'Buyer not found' : 'Something went wrong. Please try again.' },
      { status: notFound ? 404 : 500 }
    )
  }

  const { data: ticket, error: ticketErr } = await adminSupabase
    .from('support_tickets')
    .insert({ buyer_id, subject: subject.trim(), status: 'open' })
    .select('id, subject')
    .single()

  if (ticketErr || !ticket) {
    return NextResponse.json({ error: 'We couldn’t create this ticket. Please try again.' }, { status: 500 })
  }

  const trimmedMessage = message?.trim()
  if (trimmedMessage) {
    const { error: msgErr } = await adminSupabase
      .from('support_messages')
      .insert({
        ticket_id: ticket.id,
        sender_type: 'admin',
        sender_id: admin.id,
        message: trimmedMessage,
      })

    if (msgErr) {
      return NextResponse.json({ error: 'We created the ticket but couldn’t save your opening message. Please try again.' }, { status: 500 })
    }
  }

  // Schedule the email after the response is sent — ticket creation must
  // never wait on Resend latency. Same pattern as the reply route: the
  // buyer must not be left unaware that a new ticket now exists on their
  // account, whether or not an opening message was included.
  after(async () => {
    if (!process.env.RESEND_API_KEY || !buyer.email) return

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bluerock-equipment.vercel.app'
    const fromAddress = process.env.RESEND_FROM_EMAIL ?? 'BlueRock Equipment <onboarding@resend.dev>'

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/></head>
<body style="font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;max-width:560px;margin:0 auto;padding:32px 16px">
  <div style="background:#1a3a5c;padding:24px 32px;border-radius:8px 8px 0 0">
    <p style="font-size:20px;font-weight:700;color:#fff;margin:0">BlueRock Equipment</p>
    <p style="font-size:11px;color:#b8962e;margin:4px 0 0;letter-spacing:2px;text-transform:uppercase">New Support Ticket</p>
  </div>
  <div style="background:#fff;border:1px solid #dde3ea;border-top:none;padding:32px;border-radius:0 0 8px 8px">
    <p style="font-size:16px;font-weight:700;color:#1a3a5c;margin:0 0 16px">${ticket.subject}</p>
    <p style="font-size:14px;color:#4a4a4a;line-height:1.6;margin:0 0 24px">
      Our team has started a new support conversation with you.
      ${trimmedMessage ? '' : 'We’ll follow up shortly.'}
    </p>
    ${trimmedMessage ? `<p style="font-size:14px;color:#4a4a4a;line-height:1.6;margin:0 0 24px;white-space:pre-line">${trimmedMessage}</p>` : ''}
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
      subject: `New Support Ticket — ${ticket.subject} — BlueRock Equipment Support`,
      html,
    })
    if (emailErr) console.error('[admin/support-tickets/create] Resend error:', JSON.stringify(emailErr))
  })

  return NextResponse.json({ ok: true, ticket })
}
