import { createClient } from '@/lib/supabase/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import SignOutButton from './signout-button'
import BuyerMobileNav from '@/components/BuyerMobileNav'
import QuotesCard, { type QuoteRow } from '@/components/dashboard/QuotesCard'
import WatchlistCard, { type WatchlistEntry } from '@/components/dashboard/WatchlistCard'
import VaultCard from '@/components/dashboard/VaultCard'
import logo from '@/assests/img/logo.jpg'

const QUOTE_PAGE_SIZE = 10

const TIER_BADGE: Record<string, string> = {
  gold:     'bg-gold-400/20 border-gold-400/40 text-gold-400',
  silver:   'bg-slate-300/20 border-slate-300/30 text-slate-300',
  observer: 'bg-white/8 border-white/12 text-white/35',
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-navy-900 border border-white/8 rounded-2xl ${className}`}>
      {children}
    </div>
  )
}

function CardHeader({ label, count, action }: { label: string; count?: number; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/6">
      <div className="flex items-center gap-2">
        <p className="text-xs font-bold text-white/35 uppercase tracking-widest">{label}</p>
        {count !== undefined && (
          <span className="text-[10px] text-gold-400 bg-gold-400/12 border border-gold-400/20 px-2 py-0.5 rounded-full font-semibold">
            {count}
          </span>
        )}
      </div>
      {action}
    </div>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const nowISO        = new Date().toISOString()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { data: buyer },
    { data: activeQuoteRows,  count: totalActive  },
    { data: expiredQuoteRows, count: totalExpired },
    { data: pastQuoteRows,    count: totalPast    },
    { data: watchlistEntries, count: watchlistTotal },
    { count: comparisonTotal },
    { count: documentCount },
    { data: latestDocRow },
    { data: supportUnreadRaw },
  ] = await Promise.all([
    supabase.from('buyers').select('*').eq('id', user.id).single(),

    supabase
      .from('quotes')
      .select('id, machine_id, status, total_amount, lock_expires_at, created_at, port_of_discharge, machines(id, name, brand, model, price_usd)', { count: 'exact' })
      .eq('buyer_id', user.id)
      .or(`status.in.(invoice_generated,buyer_accepted,payment_pending,payment_confirmed),and(status.eq.pending_quote,lock_expires_at.gt.${nowISO})`)
      .order('created_at', { ascending: false })
      .range(0, QUOTE_PAGE_SIZE - 1),

    supabase
      .from('quotes')
      .select('id, machine_id, status, total_amount, lock_expires_at, created_at, port_of_discharge, machines(id, name, brand, model, price_usd)', { count: 'exact' })
      .eq('buyer_id', user.id)
      .eq('status', 'pending_quote')
      .lt('lock_expires_at', nowISO)
      .gt('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: false })
      .range(0, QUOTE_PAGE_SIZE - 1),

    supabase
      .from('quotes')
      .select('id, machine_id, status, total_amount, lock_expires_at, created_at, port_of_discharge, machines(id, name, brand, model, price_usd)', { count: 'exact' })
      .eq('buyer_id', user.id)
      .in('status', ['sold', 'cancelled'])
      .order('created_at', { ascending: false })
      .range(0, QUOTE_PAGE_SIZE - 1),

    /* First page for WatchlistCard SSR initial data */
    supabase
      .from('watchlist')
      .select('machine_id, in_comparison, created_at, machines(id, name, brand, model, price_usd, status, category)', { count: 'exact' })
      .eq('buyer_id', user.id)
      .order('created_at', { ascending: false })
      .range(0, 4),

    /* Comparison tray count — separate count-only query */
    supabase
      .from('watchlist')
      .select('machine_id', { count: 'exact', head: true })
      .eq('buyer_id', user.id)
      .eq('in_comparison', true),

    adminSupabase
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('buyer_id', user.id)
      .is('superseded_at', null),

    /* Quote with the most recently uploaded document — for VaultCard */
    adminSupabase
      .from('documents')
      .select('quote_id')
      .eq('buyer_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase.rpc('support_buyer_unread_count'),
  ])

  const savedCount       = watchlistTotal ?? 0
  const comparisonCount  = comparisonTotal ?? 0
  const activeQuoteCount = totalActive ?? 0
  const activeQuoteId    = latestDocRow?.quote_id ?? null
  const displayName      = buyer?.company_name || user.email?.split('@')[0] || 'Buyer'
  const tier             = buyer?.tier ?? 'observer'
  const tierBadge        = TIER_BADGE[tier] ?? TIER_BADGE.observer
  const isAdmin          = user.email === process.env.ADMIN_EMAIL
  const supportUnread    = typeof supportUnreadRaw === 'number' ? supportUnreadRaw : 0

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col">

      {/* ── NAV ── */}
      <header className="sticky top-0 z-50 bg-navy-950/96 backdrop-blur-md border-b border-white/8 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link href="/">
            <Image src={logo} alt="BlueRock Equipment" className="h-9 w-auto object-contain invert opacity-90" />
          </Link>
          <span className="hidden sm:inline text-xs text-gold-400 font-semibold uppercase tracking-widest">
            Buyer Dashboard
          </span>
        </div>
        <div className="flex items-center gap-4">
          <nav className="hidden sm:flex items-center gap-5 text-sm text-white/40">
            <Link href="/machines"         className="hover:text-white transition-colors duration-150">Inventory</Link>
            <Link href="/trust"            className="hover:text-white transition-colors duration-150">Trust Hub</Link>
            <Link href="/dashboard/support" className="hover:text-white transition-colors duration-150 flex items-center gap-1.5">
              Support
              {supportUnread > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gold-400 text-navy-950">
                  {supportUnread}
                </span>
              )}
            </Link>
          </nav>
          <div className="h-4 w-px bg-white/10 hidden sm:block" />
          {isAdmin && (
            <Link
              href="/admin"
              className="text-xs font-bold text-gold-400 hover:text-gold-300 border border-gold-400/30 hover:border-gold-400/55 px-3 py-1.5 rounded-lg transition-all duration-150"
            >
              Admin Panel
            </Link>
          )}
          <SignOutButton />
          <BuyerMobileNav isAdmin={isAdmin} />
        </div>
      </header>

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col gap-6">

        {/* ── GREETING ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs text-white/30 uppercase tracking-widest mb-1">Welcome back</p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">{displayName}</h1>
            <p className="text-white/30 text-sm mt-1">{user.email}</p>
          </div>
          <span className={`text-xs font-bold px-3.5 py-1.5 rounded-full border uppercase tracking-wider ${tierBadge}`}>
            {tier} Buyer
          </span>
        </div>

        {/* ── PROFILE INCOMPLETE BANNER (skipped onboarding) ── */}
        {!buyer?.company_name && (
          <div className="flex items-center justify-between gap-4 bg-gold-400/8 border border-gold-400/20 rounded-2xl px-5 py-4 flex-wrap">
            <div>
              <p className="text-gold-400 font-semibold text-sm">Complete Your Buyer Profile</p>
              <p className="text-white/35 text-xs mt-0.5">Takes 2 minutes — unlocks quote requests, freight estimates, and trade documents.</p>
            </div>
            <Link
              href="/auth/onboarding"
              className="bg-gold-400/15 border border-gold-400/30 text-gold-400 hover:bg-gold-400/25 text-xs font-bold px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
            >
              Complete Profile →
            </Link>
          </div>
        )}

        {/* ── KYC PENDING BANNER (profile submitted, awaiting admin verification) ── */}
        {buyer?.company_name && !buyer?.kyc_verified && (
          <div className="flex items-center justify-between gap-4 bg-amber-500/8 border border-amber-500/20 rounded-2xl px-5 py-4 flex-wrap">
            <div>
              <p className="text-amber-400 font-semibold text-sm">KYC Verification Pending</p>
              <p className="text-white/35 text-xs mt-0.5">Your profile is under review. We&apos;ll notify you once verified.</p>
            </div>
            <Link
              href="/auth/onboarding"
              className="bg-amber-500/20 border border-amber-500/30 text-amber-400 hover:bg-amber-500/30 text-xs font-bold px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
            >
              Edit Details →
            </Link>
          </div>
        )}

        {/* ── STATS BAR ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            href="/dashboard/watchlist"
            className="bg-navy-900 border border-white/8 hover:border-gold-400/25 rounded-xl px-4 py-3.5 text-center transition-all duration-150 group"
          >
            <p className="font-display text-2xl font-bold text-gold-400">{savedCount}</p>
            <p className="text-white/30 text-[10px] uppercase tracking-widest mt-1 group-hover:text-white/50 transition-colors">Machines Saved</p>
          </Link>
          <Link
            href="/dashboard/milestone-tracker"
            className="bg-navy-900 border border-white/8 hover:border-gold-400/25 rounded-xl px-4 py-3.5 text-center transition-all duration-150 group"
          >
            <p className="font-display text-2xl font-bold text-gold-400">{activeQuoteCount}</p>
            <p className="text-white/30 text-[10px] uppercase tracking-widest mt-1 group-hover:text-white/50 transition-colors">Active Quotes</p>
          </Link>
          <Link
            href="/dashboard/document-vault"
            className="bg-navy-900 border border-white/8 hover:border-gold-400/25 rounded-xl px-4 py-3.5 text-center transition-all duration-150 group"
          >
            <p className="font-display text-2xl font-bold text-gold-400">{documentCount ?? 0}</p>
            <p className="text-white/30 text-[10px] uppercase tracking-widest mt-1 group-hover:text-white/50 transition-colors">Documents Ready</p>
          </Link>
          <Link
            href="/dashboard/comparison"
            className="bg-navy-900 border border-white/8 hover:border-gold-400/25 rounded-xl px-4 py-3.5 text-center transition-all duration-150 group"
          >
            <p className="font-display text-2xl font-bold text-gold-400">{comparisonCount}<span className="text-base text-white/25">/3</span></p>
            <p className="text-white/30 text-[10px] uppercase tracking-widest mt-1 group-hover:text-white/50 transition-colors">In Comparison</p>
          </Link>
        </div>

        {/* ── MAIN GRID ── */}
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-3 lg:items-start lg:gap-6">

          {/* ── LEFT (col-span-2) ── */}
          <div className="lg:col-span-2 flex flex-col gap-6">

            {/* My Quotes & Transactions */}
            <Card>
              <CardHeader
                label="My Quotes & Transactions"
                count={activeQuoteCount || undefined}
                action={
                  <Link href="/dashboard/quotes" className="text-xs text-gold-400 hover:text-gold-300 transition-colors">
                    View All →
                  </Link>
                }
              />
              <QuotesCard
                activeQuotes={activeQuoteRows  as unknown as QuoteRow[] ?? []}
                expiredQuotes={expiredQuoteRows as unknown as QuoteRow[] ?? []}
                pastQuotes={pastQuoteRows       as unknown as QuoteRow[] ?? []}
                preferredPort={buyer?.preferred_port_of_discharge ?? null}
                totalActive={totalActive   ?? 0}
                totalExpired={totalExpired ?? 0}
                totalPast={totalPast       ?? 0}
              />
            </Card>

            {/* Watchlist & Alerts */}
            <Card>
              <CardHeader
                label="Watchlist & Alerts"
                count={savedCount || undefined}
              />
              <WatchlistCard
                initialEntries={watchlistEntries as unknown as WatchlistEntry[]}
                totalCount={savedCount}
              />
            </Card>
          </div>

          {/* ── RIGHT SIDEBAR (col-span-1) ── */}
          <div className="lg:col-span-1 flex flex-col gap-4 lg:sticky lg:top-[73px]">

            {/* Account */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-bold text-white/35 uppercase tracking-widest">Your Account</p>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wide ${tierBadge}`}>
                  {tier}
                </span>
              </div>
              <div className="mb-4">
                <p className="text-white font-semibold text-sm">{buyer?.company_name || 'Company not set'}</p>
                <p className="text-white/30 text-xs mt-0.5">{user.email}</p>
                {buyer?.preferred_port_of_discharge && (
                  <p className="text-white/25 text-xs mt-1.5">
                    📍 Preferred port: {buyer.preferred_port_of_discharge}
                  </p>
                )}
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-white/8">
                <Link href="/auth/onboarding" className="text-xs text-white/30 hover:text-white/60 transition-colors">
                  Edit KYC Details
                </Link>
                <SignOutButton />
              </div>
            </Card>

            {/* Comparison Workbench */}
            <Card className="p-5">
              <p className="text-xs font-bold text-white/35 uppercase tracking-widest mb-4">Comparison Workbench</p>
              {comparisonCount > 0 ? (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full bg-gold-400 animate-pulse" />
                    <p className="text-white text-sm font-semibold">
                      {comparisonCount} machine{comparisonCount !== 1 ? 's' : ''} in tray
                    </p>
                  </div>
                  <Link
                    href="/comparison"
                    className="block w-full text-center bg-gold-400 hover:bg-gold-300 text-navy-950 font-bold px-4 py-3 rounded-xl text-sm transition-colors duration-150 shadow-lg shadow-black/20"
                  >
                    Open Workbench
                  </Link>
                </div>
              ) : (
                <div>
                  <p className="text-white/25 text-sm mb-2">No machines selected.</p>
                  <p className="text-white/20 text-xs leading-relaxed">
                    Click <span className="text-white/35">+ Compare</span> on any machine card to add it to your tray.
                  </p>
                  <Link
                    href="/machines"
                    className="mt-4 block text-center border border-white/10 hover:border-white/25 text-white/40 hover:text-white/70 text-xs font-semibold px-4 py-2.5 rounded-xl transition-all duration-150"
                  >
                    Browse Inventory
                  </Link>
                </div>
              )}
            </Card>

            {/* Live Walkthrough */}
            <Card className="p-5">
              <p className="text-xs font-bold text-white/35 uppercase tracking-widest mb-3">
                Live Walkthrough Schedule
              </p>
              {buyer?.walkthrough_notes ? (
                <div className="bg-navy-950/50 border border-white/6 rounded-xl p-4">
                  <p className="text-white/55 text-xs leading-relaxed whitespace-pre-line">
                    {String(buyer.walkthrough_notes)}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-white/25 text-sm mb-3">No upcoming walkthroughs.</p>
                  <p className="text-white/20 text-xs leading-relaxed mb-4">
                    Book a 30-minute live video call with our yard team on any machine listing page.
                  </p>
                  <Link
                    href="/machines"
                    className="block text-center border border-white/10 hover:border-gold-400/30 text-white/40 hover:text-gold-400 text-xs font-semibold px-4 py-2.5 rounded-xl transition-all duration-150"
                  >
                    Find a Machine to Walk Through
                  </Link>
                </div>
              )}
            </Card>

            {/* Document Vault */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-bold text-white/35 uppercase tracking-widest">Document Vault</p>
                {(documentCount ?? 0) > 0 && (
                  <span className="text-[10px] text-gold-400 bg-gold-400/12 border border-gold-400/20 px-2 py-0.5 rounded-full font-semibold">
                    {documentCount} ready
                  </span>
                )}
              </div>
              <VaultCard activeQuoteId={activeQuoteId} />
            </Card>
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer className="bg-navy-950 border-t border-white/5 py-8 px-6 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <Link href="/">
              <Image src={logo} alt="BlueRock Equipment" className="h-8 w-auto object-contain invert opacity-75" />
            </Link>
            <p className="text-xs mt-1.5 text-white/20">Premium Direct-Sale Heavy Machinery</p>
          </div>
          <nav className="flex gap-5 text-xs text-white/30">
            <Link href="/machines"   className="hover:text-white transition-colors duration-150">Inventory</Link>
            <Link href="/trust"      className="hover:text-white transition-colors duration-150">Trust Hub</Link>
            <Link href="/comparison" className="hover:text-white transition-colors duration-150">Comparison</Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
