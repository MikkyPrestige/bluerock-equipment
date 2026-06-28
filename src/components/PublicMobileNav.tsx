'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Props {
  isLoggedIn: boolean
  isAdmin: boolean
}

export default function PublicMobileNav({ isLoggedIn, isAdmin }: Props) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => { setMounted(true) }, [])

  async function handleSignOut() {
    setOpen(false)
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const overlay = (
    <>
      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{ zIndex: 9998 }}
        aria-hidden="true"
      />

      {/* Panel — slides in from right */}
      <div
        className={`fixed top-0 right-0 h-full w-72 max-w-[85vw] bg-navy-950 border-l border-white/10 flex flex-col shadow-2xl transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ zIndex: 9999 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <span className="text-[10px] font-bold text-gold-400 uppercase tracking-widest">
            BlueRock Equipment
          </span>
          <button
            onClick={() => setOpen(false)}
            className="w-8 h-8 flex items-center justify-center text-white/50 hover:text-white rounded-lg hover:bg-white/10 transition-colors duration-150"
            aria-label="Close navigation menu"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="1" y1="1" x2="11" y2="11" />
              <line x1="11" y1="1" x2="1" y2="11" />
            </svg>
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex flex-col px-3 py-3 gap-0.5 flex-1">
          <Link
            href="/machines"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-3 py-3 text-sm text-white/70 hover:text-white hover:bg-white/6 rounded-xl transition-colors duration-150"
          >
            <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-60">
              <rect x="2" y="3" width="16" height="14" rx="2" />
              <path d="M2 8h16" />
              <path d="M7 3v5" />
              <path d="M13 3v5" />
            </svg>
            Inventory
          </Link>

          <Link
            href="/trust"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-3 py-3 text-sm text-white/70 hover:text-white hover:bg-white/6 rounded-xl transition-colors duration-150"
          >
            <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-60">
              <path d="M10 2L3 5v6c0 4 3 6 7 7 4-1 7-3 7-7V5L10 2Z" />
              <path d="M7 10l2 2 4-4" />
            </svg>
            Trust Hub
          </Link>

          {isLoggedIn && (
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-3 text-sm text-white/70 hover:text-white hover:bg-white/6 rounded-xl transition-colors duration-150"
            >
              <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-60">
                <rect x="2" y="2" width="7" height="7" rx="1.5" />
                <rect x="11" y="2" width="7" height="7" rx="1.5" />
                <rect x="2" y="11" width="7" height="7" rx="1.5" />
                <rect x="11" y="11" width="7" height="7" rx="1.5" />
              </svg>
              Dashboard
            </Link>
          )}

          {isLoggedIn && isAdmin && (
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-3 text-sm text-gold-400 hover:text-gold-300 hover:bg-gold-400/8 rounded-xl transition-colors duration-150"
            >
              <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-70">
                <circle cx="10" cy="6" r="3" />
                <path d="M4 18c0-3.3 2.7-6 6-6s6 2.7 6 6" />
              </svg>
              Admin Panel
            </Link>
          )}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-white/8">
          {isLoggedIn ? (
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-3 text-sm text-white/50 hover:text-white hover:bg-white/6 rounded-xl transition-colors duration-150 text-left"
            >
              <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <path d="M13 15l4-4-4-4" />
                <path d="M17 11H8" />
                <path d="M8 19H4a1 1 0 01-1-1V2a1 1 0 011-1h4" />
              </svg>
              Sign Out
            </button>
          ) : (
            <Link
              href="/auth/login"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-3 text-sm text-white/70 hover:text-white hover:bg-white/6 rounded-xl transition-colors duration-150"
            >
              <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-60">
                <path d="M7 15l-4-4 4-4" />
                <path d="M3 11h9" />
                <path d="M12 1h4a1 1 0 011 1v16a1 1 0 01-1 1h-4" />
              </svg>
              Sign In
            </Link>
          )}
        </div>
      </div>
    </>
  )

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="sm:hidden flex flex-col justify-center items-center w-9 h-9 gap-[5px] rounded-lg hover:bg-white/10 transition-colors duration-150"
        aria-label="Open navigation menu"
      >
        <span className="w-5 h-0.5 bg-white rounded-full" />
        <span className="w-5 h-0.5 bg-white rounded-full" />
        <span className="w-5 h-0.5 bg-white rounded-full" />
      </button>

      {mounted && createPortal(overlay, document.body)}
    </>
  )
}
