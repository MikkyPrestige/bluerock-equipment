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
  const url = baseUrl
    ? `${baseUrl}?a1=${encodeURIComponent(machineName)}`
    : ''

  function openPopup() {
    if (window.Calendly && url) {
      window.Calendly.initPopupWidget({ url })
    }
  }

  if (!url) return null

  return (
    <>
      {/* Calendly widget CSS — rendered in <head> by Next.js */}
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link
        href="https://assets.calendly.com/assets/external/widget.css"
        rel="stylesheet"
      />
      <Script
        src="https://assets.calendly.com/assets/external/widget.js"
        strategy="lazyOnload"
        onLoad={() => setReady(true)}
      />
      <button
        onClick={openPopup}
        disabled={!ready}
        className="w-full sm:w-auto bg-white border border-gray-300 text-gray-800 font-semibold px-6 py-3 rounded-md text-sm hover:border-blue-500 hover:text-blue-700 disabled:opacity-50 disabled:cursor-wait transition-colors"
      >
        {ready ? 'Book Live Video Walkthrough' : 'Loading scheduler…'}
      </button>
    </>
  )
}
