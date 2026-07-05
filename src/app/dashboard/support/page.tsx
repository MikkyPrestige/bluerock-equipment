import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import SignOutButton from '@/app/dashboard/signout-button'
import BuyerMobileNav from '@/components/BuyerMobileNav'
import SupportTicketsClient from '@/components/dashboard/SupportTicketsClient'
import logo from '@/assests/img/logo.jpg'

export default async function SupportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const isAdmin = user.email === process.env.ADMIN_EMAIL

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
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 text-xs text-white/30 mb-2">
            <Link href="/dashboard" className="hover:text-gold-400 transition-colors">Dashboard</Link>
            <span>/</span>
            <span className="text-white/55">Support</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">Support</h1>
          <p className="text-white/25 text-xs mt-2">
            Send us a message and we&apos;ll respond by email — replies also appear below.
          </p>
        </div>
      </div>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8">
        <SupportTicketsClient buyerId={user.id} />
      </main>

      <footer className="bg-navy-950 border-t border-white/5 py-6 px-6 mt-auto">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <p className="text-xs text-white/20">BlueRock Equipment — Premium Direct-Sale Heavy Machinery</p>
          <Link href="/dashboard" className="text-xs text-white/25 hover:text-white/50 transition-colors">
            ← Dashboard
          </Link>
        </div>
      </footer>
    </div>
  )
}
