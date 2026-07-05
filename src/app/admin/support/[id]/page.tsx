import { adminSupabase } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import logo from '@/assests/img/logo.jpg'
import AdminMobileNav from '@/components/AdminMobileNav'
import AdminThreadClient from '@/components/admin/AdminThreadClient'
import { SUPPORT_STATUS_LABELS, SUPPORT_STATUS_BADGE } from '@/lib/support'

export default async function AdminSupportTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) redirect('/auth/login')

  const { id } = await params

  const { data: ticket, error } = await adminSupabase
    .from('support_tickets')
    .select('*, buyers(company_name, email)')
    .eq('id', id)
    .single()

  if (error || !ticket) notFound()

  // Opening the thread as admin clears the unread indicator for this ticket.
  await adminSupabase
    .from('support_tickets')
    .update({ admin_last_read_at: new Date().toISOString() })
    .eq('id', id)

  const buyer = ticket.buyers as unknown as { company_name: string | null; email: string } | null
  const badge = SUPPORT_STATUS_BADGE[ticket.status] ?? 'bg-white/8 border-white/12 text-white/40'
  const label = SUPPORT_STATUS_LABELS[ticket.status] ?? ticket.status

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col">

      {/* ── STICKY NAV ── */}
      <header className="sticky top-0 z-50 bg-navy-950/96 backdrop-blur-md border-b border-white/8">
        <div className="px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Image src={logo} alt="BlueRock Equipment" className="h-9 w-auto object-contain invert opacity-90" />
            </Link>
            <div className="hidden sm:block h-5 w-px bg-white/10" />
            <div className="hidden sm:flex items-center gap-2 text-sm text-white/30">
              <Link href="/admin/support" className="hover:text-gold-400 transition-colors duration-150">← Support</Link>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin/support" className="text-xs text-gold-400 hover:text-gold-300 sm:hidden transition-colors">
              ← Support
            </Link>
            <Link href="/admin" className="text-xs text-white/35 hover:text-white/65 transition-colors hidden sm:inline">
              Dashboard
            </Link>
            <AdminMobileNav />
          </div>
        </div>
      </header>

      {/* ── TITLE BAR ── */}
      <div className="bg-navy-900 border-b border-white/8 px-6 py-5">
        <div className="max-w-3xl mx-auto flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs text-gold-400 font-semibold uppercase tracking-widest mb-2">Admin · Support Ticket</p>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-display text-xl sm:text-2xl font-bold text-white">{ticket.subject}</h1>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wide ${badge}`}>
                {label}
              </span>
            </div>
            <p className="text-white/45 text-xs mt-2">
              {buyer?.company_name || 'No company'} · {buyer?.email}
            </p>
          </div>
          <p className="text-white/25 text-xs">
            {new Date(ticket.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
        </div>
      </div>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-8">
        <AdminThreadClient
          ticketId={ticket.id}
          initialStatus={ticket.status}
        />
      </main>

      {/* ── FOOTER ── */}
      <footer className="bg-navy-950 border-t border-white/5 py-6 px-6 mt-auto">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <p className="text-xs text-white/20">BlueRock Equipment — Admin Operations</p>
          <Link href="/admin/support" className="text-xs text-white/25 hover:text-white/50 transition-colors duration-150">
            ← All Tickets
          </Link>
        </div>
      </footer>
    </div>
  )
}
