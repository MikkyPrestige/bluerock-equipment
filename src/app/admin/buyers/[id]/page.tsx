'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import logo from '@/assests/img/logo.jpg'

interface Buyer {
  id: string
  email: string
  company_name: string | null
  corporate_address: string | null
  import_export_license: string | null
  preferred_port_of_discharge: string | null
  tier: 'observer' | 'silver' | 'gold'
  kyc_verified: boolean
  walkthrough_notes: string | null
  created_at: string
}

interface Activity {
  total_quotes: number
  purchases_completed: number
  last_activity: string | null
}

const TABS = [
  { label: 'Inventory',    href: '/admin/inventory' },
  { label: 'Quotes',       href: '/admin/quotes' },
  { label: 'Buyers',       href: '/admin/buyers' },
  { label: 'Walkthroughs', href: '/admin/walkthroughs' },
  { label: 'Freight',      href: '/admin/freight-rates' },
]

const TIER_BADGES: Record<string, string> = {
  gold:     'bg-gold-400/20 border-gold-400/40 text-gold-400',
  silver:   'bg-slate-300/20 border-slate-300/30 text-slate-300',
  observer: 'bg-white/8 border-white/12 text-white/35',
}

const INP = [
  'w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-navy-900',
  'placeholder:text-slate-400 focus:outline-none focus:border-gold-400/60',
  'focus:ring-2 focus:ring-gold-400/12 transition-all duration-150',
].join(' ')

const LBL = 'block text-[10px] font-bold text-white/35 uppercase tracking-widest mb-2'

export default function AdminBuyerDetailPage() {
  const { id } = useParams<{ id: string }>()

  const [buyer,    setBuyer]    = useState<Buyer | null>(null)
  const [activity, setActivity] = useState<Activity | null>(null)
  const [loading,  setLoading]  = useState(true)

  const [tier,  setTier]  = useState<string>('observer')
  const [kyc,   setKyc]   = useState(false)
  const [notes, setNotes] = useState('')
  const [orig,  setOrig]  = useState({ tier: 'observer', kyc: false, notes: '' })

  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  useEffect(() => {
    fetch(`/api/admin/buyers/${id}`, { credentials: 'include' })
      .then(r => r.json())
      .then(({ buyer: b, activity: a }) => {
        if (b) {
          setBuyer(b)
          setTier(b.tier)
          setKyc(b.kyc_verified)
          setNotes(b.walkthrough_notes ?? '')
          setOrig({ tier: b.tier, kyc: b.kyc_verified, notes: b.walkthrough_notes ?? '' })
        }
        if (a) setActivity(a)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  const isDirty = tier !== orig.tier || kyc !== orig.kyc || notes !== orig.notes

  async function handleSave() {
    setState('saving')
    const res = await fetch(`/api/admin/buyers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier, kyc_verified: kyc, walkthrough_notes: notes }),
      credentials: 'include',
    })
    if (res.ok) {
      setState('saved')
      setOrig({ tier, kyc, notes })
      setTimeout(() => setState('idle'), 2500)
    } else {
      setState('error')
    }
  }

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-navy-950 flex flex-col">
        <header className="bg-navy-950/96 backdrop-blur-md border-b border-white/8 px-6 py-4">
          <div className="h-9 w-36 bg-white/6 rounded-lg animate-pulse" />
        </header>
        <main className="max-w-2xl mx-auto w-full px-6 py-10 space-y-5">
          {[1, 2, 3].map(n => (
            <div key={n} className="bg-navy-900 border border-white/8 rounded-2xl p-6 h-40 animate-pulse" />
          ))}
        </main>
      </div>
    )
  }

  if (!buyer) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-white/30 text-sm">Buyer not found.</p>
          <Link href="/admin/buyers" className="text-xs font-semibold text-gold-400 hover:text-gold-300 transition-colors">
            ← Back to Buyers
          </Link>
        </div>
      </div>
    )
  }

  const displayName = buyer.company_name || buyer.email
  const tierBadgeClass = TIER_BADGES[buyer.tier] ?? TIER_BADGES.observer
  const currentTierBadge = TIER_BADGES[tier] ?? TIER_BADGES.observer

  const KYC_FIELDS: [string, string | null][] = [
    ['Email',          buyer.email],
    ['Company',        buyer.company_name],
    ['Address',        buyer.corporate_address],
    ['IE License',     buyer.import_export_license],
    ['Preferred Port', buyer.preferred_port_of_discharge],
    ['Member Since',   new Date(buyer.created_at).toLocaleDateString('en-US', { dateStyle: 'medium' })],
  ]

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col">

      {/* ── STICKY NAV ── */}
      <header className="sticky top-0 z-50 bg-navy-950/96 backdrop-blur-md border-b border-white/8">
        <div className="px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Image
                src={logo}
                alt="BlueRock Equipment"
                className="h-9 w-auto object-contain invert opacity-90"
              />
            </Link>
            <div className="hidden sm:block h-5 w-px bg-white/10" />
            <div className="hidden sm:flex items-center gap-2 text-sm text-white/30">
              <Link href="/admin/buyers" className="hover:text-gold-400 transition-colors duration-150">← Buyers</Link>
              <span>/</span>
              <span className="text-white/55 font-semibold truncate max-w-[200px]">{displayName}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin/buyers" className="text-xs text-gold-400 hover:text-gold-300 sm:hidden transition-colors">
              ← Buyers
            </Link>
            <Link href="/admin" className="text-xs text-white/35 hover:text-white/65 transition-colors hidden sm:inline">
              Dashboard
            </Link>
          </div>
        </div>

        {/* Tab bar */}
        <div className="px-6 overflow-x-auto scrollbar-hide">
          <div className="flex items-center min-w-max border-t border-white/6">
            {TABS.map(tab => {
              const isActive = tab.href === '/admin/buyers'
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`px-5 py-3 text-xs font-semibold border-b-2 transition-colors duration-150 whitespace-nowrap ${
                    isActive
                      ? 'border-gold-400 text-gold-400'
                      : 'border-transparent text-white/35 hover:text-white/65 hover:border-white/20'
                  }`}
                >
                  {tab.label}
                </Link>
              )
            })}
          </div>
        </div>
      </header>

      {/* ── TITLE BAR ── */}
      <div className="bg-navy-900 border-b border-white/8 px-6 py-5">
        <div className="max-w-2xl mx-auto flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs text-gold-400 font-semibold uppercase tracking-widest mb-2">Admin · Buyer Detail</p>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-display text-xl sm:text-2xl font-bold text-white">{displayName}</h1>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wide ${tierBadgeClass}`}>
                {buyer.tier}
              </span>
              {buyer.kyc_verified ? (
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border bg-emerald-500/20 border-emerald-500/30 text-emerald-400 uppercase tracking-wide">
                  KYC ✓
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border bg-amber-500/20 border-amber-500/30 text-amber-400 uppercase tracking-wide">
                  KYC Pending
                </span>
              )}
            </div>
          </div>
          <p className="text-white/25 text-xs font-mono">{buyer.id.slice(0, 12)}…</p>
        </div>
      </div>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col gap-5">

        {/* ── KYC INFORMATION ── */}
        <div className="bg-navy-900 border border-white/8 rounded-2xl p-5 sm:p-6">
          <h2 className="font-display text-base font-bold text-gold-400 pb-4 border-b border-white/8 mb-5">
            KYC Information
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {KYC_FIELDS.map(([label, value]) => (
              <div key={label}>
                <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1.5">{label}</p>
                <p className="text-sm font-medium text-white/85">{value || <span className="text-white/25 italic">Not provided</span>}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── BUYER MANAGEMENT ── */}
        <div className="bg-navy-900 border border-white/8 rounded-2xl p-5 sm:p-6">
          <h2 className="font-display text-base font-bold text-gold-400 pb-4 border-b border-white/8 mb-5">
            Buyer Management
          </h2>

          <div className="space-y-5">

            {/* Tier */}
            <div>
              <label className={LBL}>Tier</label>
              <div className="relative">
                <select
                  value={tier}
                  onChange={e => { setTier(e.target.value); setState('idle') }}
                  className={INP + ' appearance-none pr-10'}
                >
                  <option value="observer">Observer</option>
                  <option value="silver">Silver</option>
                  <option value="gold">Gold</option>
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              {tier !== orig.tier && (
                <div className="mt-2 flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide ${currentTierBadge}`}>
                    {tier}
                  </span>
                  <span className="text-[10px] text-white/30">will be applied on save</span>
                </div>
              )}
            </div>

            {/* KYC Verified */}
            <div>
              <p className={LBL}>KYC Verified</p>
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative flex-shrink-0">
                  <input
                    type="checkbox"
                    id="kyc"
                    checked={kyc}
                    onChange={e => { setKyc(e.target.checked); setState('idle') }}
                    className="sr-only peer"
                  />
                  <div className="w-5 h-5 rounded-md border-2 border-slate-300 bg-white peer-checked:bg-gold-400 peer-checked:border-gold-400 transition-all duration-150 flex items-center justify-center">
                    {kyc && (
                      <svg className="w-3 h-3 text-navy-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">
                  {kyc ? 'Verified — buyer can proceed to quote' : 'Not verified — mark complete once documents confirmed'}
                </span>
              </label>
            </div>

            {/* Walkthrough Notes */}
            <div>
              <label htmlFor="notes" className={LBL}>Walkthrough Notes</label>
              <textarea
                id="notes"
                value={notes}
                onChange={e => { setNotes(e.target.value); setState('idle') }}
                rows={4}
                placeholder="Internal notes about this buyer's walkthrough, preferences, or special requirements…"
                className={INP + ' resize-none min-h-24'}
              />
            </div>

            {/* Feedback */}
            {state === 'error' && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">
                Save failed — please try again.
              </p>
            )}
            {state === 'saved' && (
              <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-lg">
                ✓ Changes saved successfully.
              </p>
            )}

            {/* Save button */}
            <div className="pt-1">
              <button
                onClick={handleSave}
                disabled={state === 'saving' || !isDirty}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-150 ${
                  isDirty && state !== 'saving'
                    ? 'bg-gold-400 hover:bg-gold-300 text-navy-950 shadow-lg shadow-gold-400/20'
                    : 'bg-white/6 text-white/25 cursor-not-allowed border border-white/10'
                }`}
              >
                {state === 'saving' ? 'Saving…' : isDirty ? 'Save Changes' : 'No Changes'}
              </button>
            </div>
          </div>
        </div>

        {/* ── BUYER ACTIVITY ── */}
        {activity && (
          <div className="bg-navy-900 border border-white/8 rounded-2xl p-5 sm:p-6">
            <h2 className="font-display text-base font-bold text-gold-400 pb-4 border-b border-white/8 mb-5">
              Buyer Activity
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">

              <div className="bg-navy-950/60 border border-white/6 rounded-xl p-4 text-center">
                <p className="font-display text-2xl font-bold text-white tabular-nums">
                  {activity.total_quotes}
                </p>
                <p className="text-[10px] text-white/30 uppercase tracking-widest mt-1">Quotes</p>
              </div>

              <div className="bg-navy-950/60 border border-white/6 rounded-xl p-4 text-center">
                <p className={`font-display text-2xl font-bold tabular-nums ${activity.purchases_completed > 0 ? 'text-emerald-400' : 'text-white'}`}>
                  {activity.purchases_completed}
                </p>
                <p className="text-[10px] text-white/30 uppercase tracking-widest mt-1">Purchases</p>
              </div>

              <div className="bg-navy-950/60 border border-white/6 rounded-xl p-4 text-center col-span-2 sm:col-span-1">
                <p className="text-sm font-semibold text-white/80 leading-tight">
                  {activity.last_activity
                    ? new Date(activity.last_activity).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : '—'}
                </p>
                <p className="text-[10px] text-white/30 uppercase tracking-widest mt-1">Last Activity</p>
              </div>

              <div className="bg-navy-950/60 border border-white/6 rounded-xl p-4 text-center">
                <div className="flex justify-center mb-1">
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wide ${TIER_BADGES[tier] ?? TIER_BADGES.observer}`}>
                    {tier}
                  </span>
                </div>
                <p className="text-[10px] text-white/30 uppercase tracking-widest">Confidence</p>
              </div>

            </div>

            {activity.total_quotes > 0 && (
              <div className="mt-4 pt-4 border-t border-white/6">
                <Link
                  href={`/admin/quotes?buyer=${id}`}
                  className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors duration-150"
                >
                  View all quotes from this buyer ↗
                </Link>
              </div>
            )}
          </div>
        )}

      </main>

      {/* ── FOOTER ── */}
      <footer className="bg-navy-950 border-t border-white/5 py-6 px-6 mt-auto">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <p className="text-xs text-white/20">BlueRock Equipment — Admin Operations</p>
          <Link href="/admin/buyers" className="text-xs text-white/25 hover:text-white/50 transition-colors duration-150">
            ← All Buyers
          </Link>
        </div>
      </footer>

    </div>
  )
}
