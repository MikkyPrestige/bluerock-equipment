'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'

const CATEGORIES = ['Excavators', 'Bulldozers', 'Wheel Loaders', 'Motor Graders', 'Articulated Trucks']
const BRANDS = ['Caterpillar', 'Komatsu', 'Volvo', 'Sany', 'Hitachi', 'Liebherr']
const USE_CASES = ['Construction', 'Mining & Quarrying', 'Port Operations', 'Road Building']

type Props = {
  category?: string
  brand?: string
  use_case?: string
  view?: string
}

export default function MobileFilterDrawer({ category, brand, use_case, view }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [localCat, setLocalCat] = useState(category ?? '')
  const [localBrand, setLocalBrand] = useState(brand ?? '')
  const [localUC, setLocalUC] = useState(use_case ?? '')

  useEffect(() => { setMounted(true) }, [])

  const activeCount = [category, brand, use_case].filter(Boolean).length

  function openDrawer() {
    setLocalCat(category ?? '')
    setLocalBrand(brand ?? '')
    setLocalUC(use_case ?? '')
    setOpen(true)
  }

  function close() {
    setOpen(false)
  }

  function apply() {
    const p = new URLSearchParams()
    if (localCat) p.set('category', localCat)
    if (localBrand) p.set('brand', localBrand)
    if (localUC) p.set('use_case', localUC)
    if (view) p.set('view', view)
    const url = `/machines${p.toString() ? '?' + p.toString() : ''}`
    setOpen(false)
    setTimeout(() => router.push(url), 300)
  }

  function clearAll() {
    setLocalCat('')
    setLocalBrand('')
    setLocalUC('')
    const p = new URLSearchParams()
    if (view) p.set('view', view)
    const url = `/machines${p.toString() ? '?' + p.toString() : ''}`
    setOpen(false)
    setTimeout(() => router.push(url), 300)
  }

  const chip = (active: boolean) =>
    `text-sm px-3 py-1.5 rounded-full border transition-colors duration-150 ${
      active
        ? 'bg-gold-400/15 border-gold-400/50 text-gold-300'
        : 'bg-white/5 border-white/10 text-white/50 hover:text-white/80 hover:border-white/25'
    }`

  const overlay = (
    <>
      {/* Backdrop — fades in/out */}
      <div
        onClick={close}
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{ zIndex: 9998 }}
      />

      {/* Drawer — slides up/down */}
      <div
        className={`fixed inset-x-0 bottom-0 bg-navy-900 border-t border-white/10 rounded-t-2xl transition-transform duration-300 ease-out ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ zIndex: 9999 }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-white/15 rounded-full" />
        </div>

        <div className="px-5 pb-8 pt-3 max-h-[85vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-white font-semibold text-base">Filters</h2>
            <button
              onClick={close}
              className="w-7 h-7 rounded-full bg-white/8 flex items-center justify-center text-white/50 hover:text-white transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M1 1l10 10M11 1L1 11" />
              </svg>
            </button>
          </div>

          <div className="mb-5">
            <p className="text-xs text-white/35 uppercase tracking-widest mb-2.5 font-semibold">Category</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setLocalCat(localCat === cat ? '' : cat)} className={chip(localCat === cat)}>
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-5">
            <p className="text-xs text-white/35 uppercase tracking-widest mb-2.5 font-semibold">Brand</p>
            <div className="flex flex-wrap gap-2">
              {BRANDS.map(b => (
                <button key={b} onClick={() => setLocalBrand(localBrand === b ? '' : b)} className={chip(localBrand === b)}>
                  {b}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <p className="text-xs text-white/35 uppercase tracking-widest mb-2.5 font-semibold">Use Case</p>
            <div className="flex flex-wrap gap-2">
              {USE_CASES.map(uc => (
                <button key={uc} onClick={() => setLocalUC(localUC === uc ? '' : uc)} className={chip(localUC === uc)}>
                  {uc}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-white/8">
            <button
              onClick={clearAll}
              className="flex-1 py-2.5 text-sm text-white/50 hover:text-white border border-white/10 hover:border-white/25 rounded-xl transition-colors duration-150"
            >
              Clear All
            </button>
            <button
              onClick={apply}
              className="flex-1 py-2.5 text-sm font-semibold bg-gold-400 hover:bg-gold-300 text-navy-950 rounded-xl transition-colors duration-150"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </>
  )

  return (
    <>
      <button
        onClick={openDrawer}
        className={`flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg border transition-colors duration-150 ${
          activeCount > 0
            ? 'bg-gold-400/15 border-gold-400/50 text-gold-300'
            : 'bg-white/5 border-white/10 text-white/55 hover:text-white/80 hover:border-white/25'
        }`}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M1 4h14M4 8h8M7 12h2" />
        </svg>
        Filters
        {activeCount > 0 && (
          <span className="bg-gold-400 text-navy-950 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center leading-none">
            {activeCount}
          </span>
        )}
      </button>

      {mounted && createPortal(overlay, document.body)}
    </>
  )
}
