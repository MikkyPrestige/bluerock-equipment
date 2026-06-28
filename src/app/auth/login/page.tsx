'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import logo   from '@/assests/img/logo.jpg'
import bgImg  from '@/assests/img/machinery/hero-excavator-openpit-mine.jpg'

export default function LoginPage() {
  const supabase = createClient()
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-navy-950 px-4 py-12 overflow-hidden">
      {/* Subtle background photo */}
      <Image
        src={bgImg}
        alt=""
        fill
        className="object-cover opacity-[0.08]"
        priority
        aria-hidden="true"
        sizes="100vw"
      />
      {/* Vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-navy-950/60 via-transparent to-navy-950/80 pointer-events-none" />

      {/* Form card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="relative bg-white rounded-2xl shadow-2xl shadow-black/50 px-8 py-10 sm:px-10 sm:py-12">

          {/* Close / back to homepage */}
          <Link
            href="/"
            aria-label="Back to homepage"
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-navy-900 hover:bg-slate-100 rounded-full transition-all duration-150 text-sm font-bold"
          >
            ✕
          </Link>

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
              Welcome back
            </h1>
            <p className="text-slate-500 text-sm mt-1.5 text-center">
              Sign in to your buyer account
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-[11px] font-bold text-navy-900 uppercase tracking-widest mb-2">
                Email Address
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
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-navy-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-navy-900/8 transition-all"
              />
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
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="text-sm text-slate-500 mt-7 text-center">
            No account?{' '}
            <Link href="/auth/signup" className="text-gold-500 font-semibold hover:text-gold-600 transition-colors">
              Apply for access
            </Link>
          </p>
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
