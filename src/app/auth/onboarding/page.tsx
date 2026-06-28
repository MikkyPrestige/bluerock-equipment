'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import logo   from '@/assests/img/logo.jpg'
import bgImg  from '@/assests/img/machinery/freight-port-crane-containers.jpg'

const INP = [
  'w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-navy-900',
  'placeholder:text-slate-400 focus:outline-none focus:border-gold-400',
  'focus:ring-2 focus:ring-gold-400/15 transition-all duration-150',
].join(' ')

const LBL = 'block text-xs font-semibold text-slate-600 mb-2'

const REQ = <span className="text-gold-400 ml-0.5">*</span>

export default function OnboardingPage() {
  const supabase = createClient()
  const router   = useRouter()

  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [form, setForm] = useState({
    company_name:                '',
    corporate_address:           '',
    import_export_license:       '',
    preferred_port_of_discharge: '',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    const { error: updateError } = await supabase
      .from('buyers')
      .update({
        company_name:                form.company_name,
        corporate_address:           form.corporate_address,
        import_export_license:       form.import_export_license,
        preferred_port_of_discharge: form.preferred_port_of_discharge,
        tier:         'silver',
        kyc_verified: false,
      })
      .eq('id', user.id)

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-navy-950 px-4 py-12 overflow-hidden">

      {/* Subtle background photo */}
      <Image
        src={bgImg}
        alt=""
        fill
        className="object-cover opacity-[0.07]"
        priority
        aria-hidden="true"
        sizes="100vw"
      />

      {/* Vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-navy-950/70 via-transparent to-navy-950/80 pointer-events-none" />

      {/* Card */}
      <div className="relative z-10 w-full max-w-lg">
        <div className="bg-white rounded-2xl shadow-2xl shadow-black/50 px-8 py-10 sm:px-10 sm:py-12">

          {/* Logo + step indicator */}
          <div className="flex flex-col items-center mb-8">
            <Link href="/">
              <Image
                src={logo}
                alt="BlueRock Equipment"
                className="h-12 w-auto object-contain"
              />
            </Link>

            <div className="w-8 h-0.5 bg-gold-400 mt-5 mb-5" />

            <p className="text-[10px] font-bold text-gold-500 uppercase tracking-widest mb-3">
              Optional · Complete Anytime
            </p>

            <h1 className="font-display text-2xl font-bold text-navy-900 text-center leading-tight">
              Set up your buyer profile
            </h1>
            <p className="text-slate-500 text-sm mt-2.5 text-center leading-relaxed max-w-sm">
              Completing this unlocks quote requests and trade documentation. Pre-filled on all future requests.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">

            <div>
              <label className={LBL}>Company name{REQ}</label>
              <input
                type="text"
                name="company_name"
                value={form.company_name}
                onChange={handleChange}
                required
                className={INP}
                placeholder="Acme Construction Ltd"
              />
            </div>

            <div>
              <label className={LBL}>Corporate address{REQ}</label>
              <input
                type="text"
                name="corporate_address"
                value={form.corporate_address}
                onChange={handleChange}
                required
                className={INP}
                placeholder="123 Business District, Lagos, Nigeria"
              />
            </div>

            <div>
              <label className={LBL}>Import / Export license number{REQ}</label>
              <input
                type="text"
                name="import_export_license"
                value={form.import_export_license}
                onChange={handleChange}
                required
                className={INP}
                placeholder="IMP-2024-XXXXX"
              />
            </div>

            <div>
              <label className={LBL}>Preferred port of discharge{REQ}</label>
              <input
                type="text"
                name="preferred_port_of_discharge"
                value={form.preferred_port_of_discharge}
                onChange={handleChange}
                required
                className={INP}
                placeholder="Port of Lagos, Nigeria"
              />
            </div>

            {error && (
              <p className="text-red-600 text-sm bg-red-50 border border-red-100 px-4 py-2.5 rounded-xl">
                {error}
              </p>
            )}

            <div className="pt-1">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gold-400 hover:bg-gold-300 disabled:opacity-50 disabled:cursor-not-allowed text-navy-950 font-bold py-3 px-4 rounded-xl text-sm transition-colors duration-150 shadow-md shadow-gold-400/20"
              >
                {loading ? 'Saving…' : 'Complete profile and continue'}
              </button>
            </div>

            <p className="text-center text-xs text-slate-400 pt-1">
              Your information is stored securely and only used for trade documentation.
            </p>

            <div className="text-center pt-1">
              <Link
                href="/dashboard"
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors duration-150 underline underline-offset-2"
              >
                Skip for now — I&apos;ll complete this later
              </Link>
            </div>

          </form>
        </div>
      </div>

    </div>
  )
}
