'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SUPPORT_STATUS_LABELS, SUPPORT_STATUS_BADGE, type SupportTicket } from '@/lib/support'
import NewTicketModal from './NewTicketModal'
import SupportThreadModal from './SupportThreadModal'

export default function SupportTicketsClient({ buyerId }: { buyerId: string }) {
  const supabase = createClient()

  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewTicket, setShowNewTicket] = useState(false)
  const [openTicketId, setOpenTicketId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('buyer_id', buyerId)
        .order('updated_at', { ascending: false })
      if (!cancelled) {
        setTickets((data ?? []) as SupportTicket[])
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buyerId])

  function handleCreated(ticket: SupportTicket) {
    setTickets(prev => [ticket, ...prev])
    setShowNewTicket(false)
    setOpenTicketId(ticket.id)
  }

  function handleUpdated(patch: Partial<SupportTicket> & { id: string }) {
    setTickets(prev => prev.map(t => (t.id === patch.id ? { ...t, ...patch } : t)))
  }

  const openTicket = tickets.find(t => t.id === openTicketId) ?? null

  return (
    <div className="flex flex-col gap-6">

      <div className="flex items-center justify-between gap-4">
        <p className="text-white/40 text-sm">
          {tickets.length === 0 ? 'No support requests yet.' : `${tickets.length} ticket${tickets.length !== 1 ? 's' : ''}`}
        </p>
        <button
          onClick={() => setShowNewTicket(true)}
          className="bg-gold-400 hover:bg-gold-300 text-navy-950 font-bold px-5 py-2.5 rounded-xl text-sm transition-colors duration-150 shadow-lg shadow-black/20"
        >
          + New Ticket
        </button>
      </div>

      <div className="bg-navy-900 border border-white/8 rounded-2xl overflow-hidden">
        {loading ? (
          <p className="text-white/25 text-sm py-16 text-center">Loading…</p>
        ) : tickets.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-white/25 text-sm mb-1">No support requests yet.</p>
            <p className="text-white/15 text-xs">Start a new ticket and we&apos;ll reply here and by email.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/6">
            {tickets.map(ticket => {
              const badge = SUPPORT_STATUS_BADGE[ticket.status] ?? 'bg-white/8 border-white/12 text-white/40'
              const label = SUPPORT_STATUS_LABELS[ticket.status] ?? ticket.status
              return (
                <button
                  key={ticket.id}
                  onClick={() => setOpenTicketId(ticket.id)}
                  className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 hover:bg-white/4 transition-colors duration-100"
                >
                  <div className="min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{ticket.subject}</p>
                    <p className="text-white/25 text-[11px] mt-1">
                      Last activity {new Date(ticket.updated_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>
                  <span className={`flex-shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wide whitespace-nowrap ${badge}`}>
                    {label}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {showNewTicket && (
        <NewTicketModal
          buyerId={buyerId}
          onClose={() => setShowNewTicket(false)}
          onCreated={handleCreated}
        />
      )}

      {openTicket && (
        <SupportThreadModal
          ticket={openTicket}
          buyerId={buyerId}
          onClose={() => setOpenTicketId(null)}
          onUpdated={handleUpdated}
          onRequestNewTicket={() => {
            setOpenTicketId(null)
            setShowNewTicket(true)
          }}
        />
      )}
    </div>
  )
}
