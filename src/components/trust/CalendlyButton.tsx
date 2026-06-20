'use client'

import Script from 'next/script'
import { useState } from 'react'

declare global {
  interface Window {
    Calendly?: {
      initPopupWidget: (opts: { url: string }) => void
    }
  }
}

export default function CalendlyButton({ machineName }: { machineName: string }) {
  const [ready, setReady] = useState(false)

  const baseUrl = process.env.NEXT_PUBLIC_CALENDLY_URL ?? ''
  const url = baseUrl ? `${baseUrl}?a1=${encodeURIComponent(machineName)}` : ''

  function openPopup() {
    if (window.Calendly && url) {
      window.Calendly.initPopupWidget({ url })
    }
  }

  if (!url) return null

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link href="https://assets.calendly.com/assets/external/widget.css" rel="stylesheet" />
      <Script
        src="https://assets.calendly.com/assets/external/widget.js"
        strategy="lazyOnload"
        onLoad={() => setReady(true)}
      />
      <button
        onClick={openPopup}
        disabled={!ready}
        className="w-full bg-gold-400 hover:bg-gold-300 disabled:opacity-50 disabled:cursor-wait text-navy-950 font-bold px-5 py-3 rounded-lg text-sm transition-colors duration-150 shadow-lg shadow-black/20"
      >
        {ready ? '▶ Book Live Video Walkthrough' : 'Loading scheduler…'}
      </button>
    </>
  )
}
