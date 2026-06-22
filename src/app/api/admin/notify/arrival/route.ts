import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { adminSupabase } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { buyer_id, buyer_email, company_name, machine_name, machine_category } =
    await request.json()

  if (!buyer_id || !buyer_email || !machine_category) {
    return NextResponse.json({ error: 'buyer_id, buyer_email, and machine_category required' }, { status: 400 })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bluerock-equipment.vercel.app'
  const inventoryUrl = `${siteUrl}/machines?category=${encodeURIComponent(machine_category)}`
  const displayName = company_name || buyer_email

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/></head>
<body style="font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;max-width:560px;margin:0 auto;padding:32px 16px">
  <div style="background:#1a3a5c;padding:24px 32px;border-radius:8px 8px 0 0">
    <p style="font-size:20px;font-weight:700;color:#fff;margin:0">BlueRock Equipment</p>
    <p style="font-size:11px;color:#b8962e;margin:4px 0 0;letter-spacing:2px;text-transform:uppercase">Premium Industrial Machinery</p>
  </div>

  <div style="background:#fff;border:1px solid #dde3ea;border-top:none;padding:32px;border-radius:0 0 8px 8px">
    <p style="font-size:16px;font-weight:700;color:#1a3a5c;margin:0 0 16px">
      Similar ${machine_category} Now Available
    </p>

    <p style="font-size:14px;color:#4a4a4a;line-height:1.6;margin:0 0 12px">
      Hi ${displayName},
    </p>
    <p style="font-size:14px;color:#4a4a4a;line-height:1.6;margin:0 0 12px">
      You previously saved <strong>${machine_name}</strong> to your watchlist.
      We want to let you know that similar <strong>${machine_category}</strong> equipment
      is now available in our inventory.
    </p>
    <p style="font-size:14px;color:#4a4a4a;line-height:1.6;margin:0 0 24px">
      Browse our current selection and request a quote directly — prices include a 48-hour lock.
    </p>

    <a href="${inventoryUrl}"
       style="display:inline-block;background:#1a3a5c;color:#fff;font-size:14px;font-weight:700;
              padding:12px 28px;border-radius:6px;text-decoration:none">
      Browse Available ${machine_category} &rarr;
    </a>

    <hr style="border:none;border-top:1px solid #dde3ea;margin:32px 0"/>
    <p style="font-size:11px;color:#9ca3af;margin:0">
      BlueRock Equipment &mdash; Direct-Sale Heavy Machinery &mdash;
      <a href="${siteUrl}" style="color:#9ca3af">${siteUrl}</a>
    </p>
  </div>
</body>
</html>`

  const fromAddress = process.env.RESEND_FROM_EMAIL
    ?? 'BlueRock Equipment <onboarding@resend.dev>'

  if (!process.env.RESEND_API_KEY) {
    console.warn('[notify/arrival] RESEND_API_KEY not set — skipping email send')
  } else {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { error: emailErr } = await resend.emails.send({
      from: fromAddress,
      to: buyer_email,
      subject: `Similar ${machine_category} Now Available — BlueRock Equipment`,
      html,
    })
    if (emailErr) {
      console.error('[notify/arrival] Resend error:', JSON.stringify(emailErr))
      return NextResponse.json(
        { error: `Email delivery failed: ${(emailErr as { message?: string }).message ?? JSON.stringify(emailErr)}` },
        { status: 502 }
      )
    }
  }

  // Record in notifications table
  await adminSupabase.from('notifications').insert({
    buyer_id,
    type: 'arrival_alert',
    message: `Admin notified buyer about similar ${machine_category} (was watching: ${machine_name})`,
    sent_via: 'email',
    sent_at: new Date().toISOString(),
  })

  return NextResponse.json({ ok: true })
}
