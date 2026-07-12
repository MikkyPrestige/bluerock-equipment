import { createClient } from '@/lib/supabase/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import SignOutButton from '@/app/dashboard/signout-button'
import BuyerMobileNav from '@/components/BuyerMobileNav'
import logo from '@/assests/img/logo.jpg'

const STATUS: Record<string, { label: string; badge: string }> = {
  pending_quote:     { label: 'Awaiting Quote',   badge: 'bg-amber-500/20 border-amber-500/30 text-amber-400' },
  invoice_generated: { label: 'Proforma Ready',   badge: 'bg-blue-500/20 border-blue-500/30 text-blue-400' },
  buyer_accepted:    { label: 'Accepted',          badge: 'bg-indigo-500/20 border-indigo-500/30 text-indigo-400' },
  payment_pending:   { label: 'Payment Pending',   badge: 'bg-orange-500/20 border-orange-500/30 text-orange-400' },
  payment_confirmed: { label: 'Payment Confirmed', badge: 'bg-teal-500/20 border-teal-500/30 text-teal-400' },
  sold:              { label: 'Sold',              badge: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' },
  cancelled:         { label: 'Cancelled',         badge: 'bg-white/8 border-white/12 text-white/30' },
}

type QuoteRow = {
  id: string
  status: string
  created_at: string
  machines: { name: string | null; brand: string; model: string } | null
}

function machineName(q: QuoteRow) {
  const m = q.machines
  if (!m) return 'Unknown Machine'
  return m.name || `${m.brand} ${m.model}`
}

const PAGE_SIZE = 10

export default async function DocumentsIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1', 10))
  const offset = (page - 1) * PAGE_SIZE

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const isAdmin = user.email === process.env.ADMIN_EMAIL

  const [{ data: rawQuotes, count: totalCount }, { data: docRows }] = await Promise.all([
    supabase
      .from('quotes')
      .select('id, status, created_at, machines(name, brand, model)', { count: 'exact' })
      .eq('buyer_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1),

    /* All documents for this buyer, aggregated per quote below */
    adminSupabase
      .from('documents')
      .select('quote_id, created_at, superseded_at')
      .eq('buyer_id', user.id),
  ])

  const quotes    = (rawQuotes ?? []) as unknown as QuoteRow[]
  const total     = totalCount ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const docStats: Record<string, { activeCount: number; lastActivity: string | null }> = {}
  for (const d of docRows ?? []) {
    const stat = docStats[d.quote_id] ?? { activeCount: 0, lastActivity: null }
    if (!d.superseded_at) stat.activeCount += 1
    if (!stat.lastActivity || d.created_at > stat.lastActivity) stat.lastActivity = d.created_at
    docStats[d.quote_id] = stat
  }

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col">

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
            <Link href="/dashboard" className="hover:text-white transition-colors duration-150">Overview</Link>
            <Link href="/machines"  className="hover:text-white transition-colors duration-150">Inventory</Link>
          </nav>
          <div className="h-4 w-px bg-white/10 hidden sm:block" />
          {isAdmin && (
            <Link href="/admin" className="text-xs font-bold text-gold-400 hover:text-gold-300 border border-gold-400/30 hover:border-gold-400/55 px-3 py-1.5 rounded-lg transition-all duration-150">
              Admin Panel
            </Link>
          )}
          <SignOutButton />
          <BuyerMobileNav isAdmin={isAdmin} />
        </div>
      </header>

      <div className="bg-navy-900 border-b border-white/8 px-6 py-5">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 text-xs text-white/30 mb-2">
            <Link href="/dashboard" className="hover:text-gold-400 transition-colors">Dashboard</Link>
            <span>/</span>
            <span className="text-white/55">Documents</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">Documents by Quote</h1>
            {total > 0 && (
              <span className="text-sm font-bold px-3 py-1 rounded-full bg-gold-400/15 border border-gold-400/30 text-gold-400">
                {total}
              </span>
            )}
          </div>
          <p className="text-white/25 text-xs mt-2">
            Trade documents are organized per quote. Open a quote to view or download its documents.
          </p>
        </div>
      </div>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8">
        {quotes.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-white/25 text-lg mb-2">No quotes yet</p>
            <p className="text-white/15 text-sm mb-6">Documents will appear here once you have an active quote.</p>
            <Link
              href="/machines"
              className="bg-gold-400 hover:bg-gold-300 text-navy-950 font-bold px-5 py-2.5 rounded-xl text-sm transition-colors"
            >
              Browse Inventory →
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {quotes.map(q => {
              const status = STATUS[q.status] ?? { label: q.status.replace(/_/g, ' '), badge: 'bg-white/8 border-white/12 text-white/40' }
              const stat = docStats[q.id] ?? { activeCount: 0, lastActivity: null }

              return (
                <Link
                  key={q.id}
                  href={`/dashboard/quotes/${q.id}`}
                  className="block bg-navy-900 border border-white/8 hover:border-white/16 rounded-2xl p-5 transition-all duration-150 group"
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="text-xs font-semibold text-white/30 font-mono">
                          PRF-{q.id.slice(0, 8).toUpperCase()}
                        </span>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wide ${status.badge}`}>
                          {status.label}
                        </span>
                      </div>
                      <h3 className="font-display font-bold text-white text-lg leading-tight group-hover:text-gold-400 transition-colors">
                        {machineName(q)}
                      </h3>
                      <p className="text-white/25 text-xs mt-1">
                        Requested {new Date(q.created_at).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {stat.activeCount > 0 ? (
                        <>
                          <p className="font-display text-xl font-bold text-gold-400">
                            {stat.activeCount} doc{stat.activeCount !== 1 ? 's' : ''}
                          </p>
                          {stat.lastActivity && (
                            <p className="text-white/25 text-xs mt-1">
                              Last activity {new Date(stat.lastActivity).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-white/20 text-xs italic">No documents yet</p>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-end mt-3">
                    <span className="text-xs font-semibold text-gold-400/70 group-hover:text-gold-400 transition-colors">
                      Open Quote →
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between mt-6 px-1">
            <Link
              href={`/dashboard/documents?page=${page - 1}`}
              aria-disabled={page <= 1}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all duration-150 ${
                page <= 1
                  ? 'border-white/6 text-white/15 pointer-events-none'
                  : 'border-white/15 text-white/50 hover:border-white/30 hover:text-white/80'
              }`}
            >
              ← Previous
            </Link>
            <p className="text-xs text-white/30 tabular-nums">
              Page <span className="text-white/55 font-semibold">{page}</span> of{' '}
              <span className="text-white/55 font-semibold">{totalPages}</span>
            </p>
            <Link
              href={`/dashboard/documents?page=${page + 1}`}
              aria-disabled={page >= totalPages}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all duration-150 ${
                page >= totalPages
                  ? 'border-white/6 text-white/15 pointer-events-none'
                  : 'border-white/15 text-white/50 hover:border-white/30 hover:text-white/80'
              }`}
            >
              Next →
            </Link>
          </div>
        )}
      </main>

      <footer className="bg-navy-950 border-t border-white/5 py-6 px-6 mt-auto">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <p className="text-xs text-white/20">BlueRock Equipment — Premium Direct-Sale Heavy Machinery</p>
          <Link href="/dashboard" className="text-xs text-white/25 hover:text-white/50 transition-colors">
            ← Dashboard
          </Link>
        </div>
      </footer>
    </div>
  )
}
