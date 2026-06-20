'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import logo   from '@/assests/img/logo.jpg'
import bgImg  from '@/assests/img/machinery/hero-industrial-port-sunrise.jpg'

export default function SignupPage() {
  const supabase = createClient()
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error: signupError } = await supabase.auth.signUp({ email, password })
    if (signupError || !data.user) {
      setError(signupError?.message || 'Signup failed')
      setLoading(false)
      return
    }

    const { error: buyerError } = await supabase
      .from('buyers')
      .insert({ id: data.user.id, email, tier: 'observer' })
    if (buyerError) {
      setError(buyerError.message)
      setLoading(false)
      return
    }

    router.push('/auth/onboarding')
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-navy-950 px-4 py-12 overflow-hidden">
      {/* Subtle background photo */}
      <Image
        src={bgImg}
        alt=""
        fill
        className="object-cover opacity-[0.09]"
        priority
        aria-hidden="true"
      />
      {/* Vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-navy-950/70 via-transparent to-navy-950/80 pointer-events-none" />

      {/* Form card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl shadow-black/50 px-8 py-10 sm:px-10 sm:py-12">

          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <Link href="/">
              <Image
                src={logo}
                alt="BlueRock Equipment"
                className="h-12 w-auto object-contain"
              />
            </Link>
            <div className="w-8 h-0.5 bg-gold-400 mt-5 mb-5" />
            <h1 className="font-display text-2xl font-bold text-navy-900 text-center">
              Apply for Access to
            </h1>
            <p className="text-slate-500 text-sm mt-1.5 text-center">
              BlueRock Equipments
            </p>
          </div>

          {/* Exclusivity note */}
          <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-6">
            <span className="text-gold-500 text-sm flex-shrink-0">◈</span>
            <p className="text-slate-600 text-xs leading-relaxed">
              KYC verification required after registration.
            </p>
          </div>

          <form onSubmit={handleSignup} className="space-y-5">
            <div>
              <label className="block text-[11px] font-bold text-navy-900 uppercase tracking-widest mb-2">
                Work Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@company.com"
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-navy-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-navy-900/8 transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-navy-900 uppercase tracking-widest mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Minimum 8 characters"
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-navy-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-navy-900/8 transition-all"
              />
              <p className="text-[11px] text-slate-400 mt-1.5">Minimum 8 characters</p>
            </div>

            {error && (
              <p className="text-red-600 text-sm bg-red-50 border border-red-100 px-4 py-3 rounded-xl">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gold-400 hover:bg-gold-500 disabled:opacity-50 disabled:cursor-not-allowed text-navy-950 font-bold py-3.5 px-4 rounded-xl text-sm transition-colors duration-150 shadow-md shadow-black/10 mt-2"
            >
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          {/* KYC next-step note */}
          <p className="text-[11px] text-slate-400 text-center mt-5 leading-relaxed">
            Next: you&apos;ll complete a short KYC form with your company details.
          </p>

          <div className="border-t border-slate-100 mt-5 pt-5">
            <p className="text-sm text-slate-500 text-center">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-gold-500 font-semibold hover:text-gold-600 transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        {/* Back link */}
        <p className="text-center mt-5">
          <Link href="/" className="text-xs text-white/30 hover:text-white/60 transition-colors">
            ← Back to BlueRock Equipment
          </Link>
        </p>
      </div>
    </div>
  )
}
