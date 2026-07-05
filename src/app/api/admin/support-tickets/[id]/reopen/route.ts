import { NextRequest, NextResponse, after } from 'next/server'
import { Resend } from 'resend'
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

  const { data: ticket, error } = await adminSupabase
    .from('support_tickets')
    .update({ status: 'open', closed_by: null })
    .eq('id', id)
    .select('id, subject, buyers(email, company_name)')
    .single()

  if (error || !ticket) {
    return NextResponse.json({ error: error?.message ?? 'Ticket not found' }, { status: 404 })
  }

  after(async () => {
    const buyer = ticket.buyers as unknown as { email: string; company_name: string | null } | null
    if (!process.env.RESEND_API_KEY || !buyer?.email) return

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bluerock-equipment.vercel.app'
    const fromAddress = process.env.RESEND_FROM_EMAIL ?? 'BlueRock Equipment <onboarding@resend.dev>'
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { error: emailErr } = await resend.emails.send({
      from: fromAddress,
      to: buyer.email,
      subject: `Ticket Reopened — ${ticket.subject} — BlueRock Equipment Support`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/></head>
<body style="font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;max-width:560px;margin:0 auto;padding:32px 16px">
  <div style="background:#1a3a5c;padding:24px 32px;border-radius:8px 8px 0 0">
    <p style="font-size:20px;font-weight:700;color:#fff;margin:0">BlueRock Equipment</p>
    <p style="font-size:11px;color:#b8962e;margin:4px 0 0;letter-spacing:2px;text-transform:uppercase">Support Ticket Reopened</p>
  </div>
  <div style="background:#fff;border:1px solid #dde3ea;border-top:none;padding:32px;border-radius:0 0 8px 8px">
    <p style="font-size:14px;color:#4a4a4a;line-height:1.6;margin:0 0 24px">
      Your support ticket <strong>${ticket.subject}</strong> has been reopened by our team.
    </p>
    <a href="${siteUrl}/dashboard/support"
       style="display:inline-block;background:#1a3a5c;color:#fff;font-size:14px;font-weight:700;
              padding:12px 28px;border-radius:6px;text-decoration:none">
      View in Dashboard &rarr;
    </a>
  </div>
</body>
</html>`,
    })
    if (emailErr) console.error('[admin/support-tickets/reopen] Resend error:', JSON.stringify(emailErr))
  })

  return NextResponse.json({ ok: true })
}
