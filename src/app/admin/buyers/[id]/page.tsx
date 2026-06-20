'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

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

export default function AdminBuyerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [buyer, setBuyer] = useState<Buyer | null>(null)
  const [tier, setTier] = useState<string>('observer')
  const [kyc, setKyc] = useState(false)
  const [notes, setNotes] = useState('')
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  useEffect(() => {
    fetch(`/api/admin/buyers/${id}`, { credentials: 'include' })
      .then(r => r.json())
      .then(({ buyer: b }) => {
        if (b) {
          setBuyer(b)
          setTier(b.tier)
          setKyc(b.kyc_verified)
          setNotes(b.walkthrough_notes ?? '')
        }
      })
  }, [id])

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
      setTimeout(() => setState('idle'), 2000)
    } else {
      setState('error')
    }
  }

  if (!buyer) return <div className="p-8 text-sm text-gray-400">Loading…</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link href="/admin/buyers" className="text-sm text-gray-500 hover:text-gray-900">← Buyers</Link>
        <h1 className="text-lg font-bold text-gray-900">{buyer.company_name || buyer.email}</h1>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-6">

        {/* KYC Info (read-only) */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">KYC Information</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[
              ['Email',          buyer.email],
              ['Company',        buyer.company_name],
              ['Address',        buyer.corporate_address],
              ['IE License',     buyer.import_export_license],
              ['Preferred Port', buyer.preferred_port_of_discharge],
              ['Member Since',   new Date(buyer.created_at).toLocaleDateString('en-US', { dateStyle: 'medium' })],
            ].map(([label, value]) => (
              <div key={label as string}>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
                <p className="font-medium text-gray-900">{value || '—'}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Editable Fields */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Buyer Management</h2>

          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Tier</label>
            <select
              value={tier}
              onChange={e => setTier(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="observer">Observer</option>
              <option value="silver">Silver</option>
              <option value="gold">Gold</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="kyc"
              checked={kyc}
              onChange={e => setKyc(e.target.checked)}
              className="w-4 h-4 text-blue-700 rounded border-gray-300 focus:ring-blue-500"
            />
            <label htmlFor="kyc" className="text-sm font-medium text-gray-700">KYC Verified</label>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Walkthrough Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Internal notes about this buyer…"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {state === 'error'  && <p className="text-sm text-red-600">Save failed.</p>}
          {state === 'saved'  && <p className="text-sm text-green-700">Saved.</p>}

          <button
            onClick={handleSave}
            disabled={state === 'saving'}
            className="bg-blue-700 text-white px-5 py-2 rounded-md text-sm font-semibold hover:bg-blue-800 disabled:opacity-50"
          >
            {state === 'saving' ? 'Saving…' : 'Save Changes'}
          </button>
        </div>

      </main>
    </div>
  )
}
