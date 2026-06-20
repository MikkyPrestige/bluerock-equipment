import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'BlueRock Equipment — Premium Direct-Sale Heavy Machinery',
    template: '%s | BlueRock Equipment',
  },
  description:
    'Buy inspected, export-ready heavy machinery direct from the source. No brokers, no markups. Excavators, bulldozers, wheel loaders and more with full export documentation.',
  keywords: ['heavy machinery', 'used excavator', 'bulldozer for sale', 'wheel loader', 'export heavy equipment', 'direct sale'],
  openGraph: {
    title: 'BlueRock Equipment — Premium Direct-Sale Heavy Machinery',
    description: 'Inspected, documented, and ready to ship. Buy direct with a 48-hour price lock.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
