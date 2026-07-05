'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  SUPPORT_BUCKET,
  SUPPORT_STATUS_LABELS,
  SUPPORT_STATUS_BADGE,
  SUPPORT_FILE_MAX_BYTES,
  SUPPORT_FILE_MAX_COUNT,
  SUPPORT_ALLOWED_TYPES,
  type SupportTicket,
  type SupportMessage,
} from '@/lib/support'
import SupportModalShell from './SupportModalShell'

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_')
}

function fileNameFromPath(path: string): string {
  const parts = path.split('/')
  return parts[parts.length - 1]
}

export default function SupportThreadModal({
  ticket,
  buyerId,
  onClose,
  onUpdated,
  onRequestNewTicket,
}: {
  ticket: SupportTicket
  buyerId: string
  onClose: () => void
  onUpdated: (patch: Partial<SupportTicket> & { id: string }) => void
  onRequestNewTicket: () => void
}) {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState(ticket.status)
  const [closedBy, setClosedBy] = useState(ticket.closed_by)

  const [draft, setDraft] = useState('')
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [fileError, setFileError] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [sendBlockedByPolicy, setSendBlockedByPolicy] = useState(false)
  const [closing, setClosing] = useState(false)
  const [downloadingPath, setDownloadingPath] = useState<string | null>(null)

  const isBlocked = status === 'closed' || status === 'resolved'
  const showNewTicketCta = isBlocked && !(status === 'closed' && closedBy === 'buyer')
  const blockedMessage =
    status === 'closed' && closedBy === 'buyer'
      ? 'You closed this conversation. Only our team can reopen it.'
      : status === 'resolved'
        ? 'This ticket was marked resolved. Open a new ticket if you need further help.'
        : 'Support closed this conversation. Open a new ticket if you need further help.'

  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data } = await supabase
        .from('support_messages')
        .select('*')
        .eq('ticket_id', ticket.id)
        .order('created_at', { ascending: true })
      if (!cancelled) {
        setMessages((data ?? []) as SupportMessage[])
        setLoading(false)
      }
      await supabase.rpc('support_mark_buyer_read', { p_ticket_id: ticket.id })
      onUpdated({ id: ticket.id, buyer_last_read_at: new Date().toISOString() })
    }
    load()

    const channel = supabase
      .channel(`support_messages:${ticket.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `ticket_id=eq.${ticket.id}` },
        payload => {
          const msg = payload.new as SupportMessage
          setMessages(prev => (prev.some(m => m.id === msg.id) ? prev : [...prev, msg]))
          if (msg.sender_type === 'admin') {
            supabase.rpc('support_mark_buyer_read', { p_ticket_id: ticket.id })
            onUpdated({ id: ticket.id, buyer_last_read_at: new Date().toISOString() })
          }
        }
      )
      .on(
        // Reacts the moment admin closes/resolves this ticket while the
        // buyer already has the thread open, disabling the composer
        // proactively instead of only after a failed send attempt.
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'support_tickets', filter: `id=eq.${ticket.id}` },
        payload => {
          const updated = payload.new as SupportTicket
          setStatus(updated.status)
          setClosedBy(updated.closed_by)
          onUpdated({ id: ticket.id, status: updated.status, closed_by: updated.closed_by })
        }
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setFileError('')
    const incoming = Array.from(files)
    const accepted: File[] = []
    for (const file of incoming) {
      if (!SUPPORT_ALLOWED_TYPES.includes(file.type)) {
        setFileError(`${file.name}: unsupported file type.`)
        continue
      }
      if (file.size > SUPPORT_FILE_MAX_BYTES) {
        setFileError(`${file.name}: exceeds ${SUPPORT_FILE_MAX_BYTES / (1024 * 1024)}MB limit.`)
        continue
      }
      accepted.push(file)
    }
    setPendingFiles(prev => {
      const combined = [...prev, ...accepted]
      if (combined.length > SUPPORT_FILE_MAX_COUNT) {
        setFileError(`Only ${SUPPORT_FILE_MAX_COUNT} attachments allowed per message.`)
        return combined.slice(0, SUPPORT_FILE_MAX_COUNT)
      }
      return combined
    })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSend = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!draft.trim() && pendingFiles.length === 0) || isBlocked) return

    setSending(true)
    setSendError('')
    setSendBlockedByPolicy(false)

    const folder = crypto.randomUUID()
    const uploadedPaths: string[] = []
    for (const file of pendingFiles) {
      const path = `${buyerId}/${folder}/${sanitizeFileName(file.name)}`
      const { error: uploadErr } = await supabase.storage.from(SUPPORT_BUCKET).upload(path, file, { contentType: file.type })
      if (uploadErr) {
        setSendError(`Attachment upload failed: ${uploadErr.message}`)
        setSending(false)
        return
      }
      uploadedPaths.push(path)
    }

    const { data: inserted, error } = await supabase
      .from('support_messages')
      .insert({
        ticket_id: ticket.id,
        sender_type: 'buyer',
        sender_id: buyerId,
        message: draft.trim(),
        file_urls: uploadedPaths,
      })
      .select()
      .single()

    if (error || !inserted) {
      // 42501 (insufficient_privilege) is what Postgres raises for an RLS
      // WITH CHECK failure. The disabled-input state above is the primary
      // gate — this only catches the case where an insert reaches the
      // database anyway (stale client state, a status change racing in from
      // another tab or from admin). Status is the only thing that WITH
      // CHECK clause enforces, so a violation here always means the ticket
      // closed out from under this request.
      const isPolicyViolation = error?.code === '42501' || /row-level security/i.test(error?.message ?? '')
      if (isPolicyViolation) {
        setSendError('This ticket is no longer open for replies. Open a new ticket if you need further help.')
        setSendBlockedByPolicy(true)

        // Pull the true current status so the composer disables itself via
        // the same isBlocked logic, instead of staying clickable until a
        // reload. Falls back to a generic closed state if the refetch
        // itself fails, since disabling is the non-negotiable part.
        const { data: freshTicket } = await supabase
          .from('support_tickets')
          .select('status, closed_by')
          .eq('id', ticket.id)
          .single()

        if (freshTicket) {
          setStatus(freshTicket.status)
          setClosedBy(freshTicket.closed_by)
          onUpdated({ id: ticket.id, status: freshTicket.status, closed_by: freshTicket.closed_by })
        } else {
          setStatus('closed')
          setClosedBy(null)
          onUpdated({ id: ticket.id, status: 'closed', closed_by: null })
        }
      } else {
        setSendError(error?.message ?? 'Failed to send message')
      }
      setSending(false)
      return
    }

    fetch('/api/support-tickets/notify-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId: inserted.id }),
      credentials: 'include',
    }).catch(() => {})

    setDraft('')
    setPendingFiles([])
    setSending(false)
  }, [draft, isBlocked, pendingFiles, buyerId, ticket.id, supabase])

  async function handleClose() {
    setClosing(true)
    await supabase.rpc('support_close_ticket_as_buyer', { p_ticket_id: ticket.id })
    setStatus('closed')
    setClosedBy('buyer')
    onUpdated({ id: ticket.id, status: 'closed', closed_by: 'buyer' })
    setClosing(false)
  }

  async function handleView(path: string) {
    setDownloadingPath(path)
    const { data, error } = await supabase.storage.from(SUPPORT_BUCKET).createSignedUrl(path, 300)
    setDownloadingPath(null)
    if (error || !data) return
    window.open(data.signedUrl, '_blank', 'noopener')
  }

  const badge = SUPPORT_STATUS_BADGE[status] ?? 'bg-white/8 border-white/12 text-white/40'
  const label = SUPPORT_STATUS_LABELS[status] ?? status

  return (
    <SupportModalShell title={ticket.subject} onClose={onClose} wide>
      <div className="flex flex-col h-full -m-5">
        {/* Status bar */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-white/6 flex-shrink-0">
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wide ${badge}`}>
            {label}
          </span>
          {status !== 'closed' && (
            <button
              onClick={handleClose}
              disabled={closing}
              className="text-[11px] font-semibold text-white/35 hover:text-red-400 disabled:opacity-50 transition-colors duration-150"
            >
              {closing ? 'Closing…' : 'Close this ticket'}
            </button>
          )}
        </div>

        {/* Message thread */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3 min-h-[280px]">
          {loading ? (
            <p className="text-white/25 text-sm text-center py-8">Loading…</p>
          ) : messages.length === 0 ? (
            <p className="text-white/25 text-sm text-center py-8">No messages yet.</p>
          ) : (
            messages.map(msg => {
              const isBuyer = msg.sender_type === 'buyer'
              return (
                <div key={msg.id} className={`flex ${isBuyer ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                    isBuyer ? 'bg-gold-400/15 border border-gold-400/25' : 'bg-navy-800 border border-white/8'
                  }`}>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-1 text-white/30">
                      {isBuyer ? 'You' : 'BlueRock Support'}
                    </p>
                    <p className="text-sm text-white/80 whitespace-pre-line leading-relaxed">{msg.message}</p>
                    {msg.file_urls.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {msg.file_urls.map(path => (
                          <button
                            key={path}
                            onClick={() => handleView(path)}
                            disabled={downloadingPath === path}
                            className="text-[10px] font-semibold text-gold-400 hover:text-gold-300 disabled:text-white/25 border border-gold-400/20 hover:border-gold-400/40 px-2 py-0.5 rounded-md transition-all duration-150"
                          >
                            {downloadingPath === path ? 'Opening…' : `📎 ${fileNameFromPath(path)}`}
                          </button>
                        ))}
                      </div>
                    )}
                    <p className="text-[10px] text-white/20 mt-1.5">
                      {new Date(msg.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>
                </div>
              )
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        <div className="border-t border-white/6 px-5 py-4 flex-shrink-0">
          {isBlocked ? (
            <div className="bg-white/4 border border-white/8 rounded-xl px-4 py-3 text-center space-y-2.5">
              <p className="text-xs text-white/30">{blockedMessage}</p>
              {showNewTicketCta && (
                <button
                  onClick={onRequestNewTicket}
                  className="bg-gold-400 hover:bg-gold-300 text-navy-950 font-bold px-4 py-2 rounded-xl text-xs transition-colors duration-150"
                >
                  + Open New Ticket
                </button>
              )}
            </div>
          ) : (
            <form onSubmit={handleSend} className="space-y-2">
              {pendingFiles.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {pendingFiles.map((file, i) => (
                    <div key={`${file.name}-${i}`} className="flex items-center gap-1.5 bg-navy-800 border border-white/10 rounded-lg px-2.5 py-1">
                      <span className="text-[11px] text-white/60 max-w-[140px] truncate">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => setPendingFiles(prev => prev.filter((_, idx) => idx !== i))}
                        className="text-red-400/70 hover:text-red-400 text-xs font-semibold"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {fileError && <p className="text-amber-400 text-[11px]">{fileError}</p>}
              {sendError && (
                <div className="space-y-1.5">
                  <p className="text-red-400 text-[11px]">{sendError}</p>
                  {sendBlockedByPolicy && (
                    <button
                      type="button"
                      onClick={onRequestNewTicket}
                      className="bg-gold-400 hover:bg-gold-300 text-navy-950 font-bold px-4 py-2 rounded-xl text-xs transition-colors duration-150"
                    >
                      + Open New Ticket
                    </button>
                  )}
                </div>
              )}
              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-shrink-0 w-10 h-10 flex items-center justify-center text-white/40 hover:text-gold-400 border border-white/10 hover:border-gold-400/30 rounded-xl transition-colors duration-150"
                  title="Attach files"
                >
                  📎
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={SUPPORT_ALLOWED_TYPES.join(',')}
                  onChange={e => addFiles(e.target.files)}
                  className="hidden"
                />
                <textarea
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  rows={1}
                  placeholder="Type a message…"
                  className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-navy-900 placeholder:text-slate-400 focus:outline-none focus:border-gold-400/60 focus:ring-2 focus:ring-gold-400/12 transition-all duration-150 resize-none"
                />
                <button
                  type="submit"
                  disabled={sending || (!draft.trim() && pendingFiles.length === 0)}
                  className="flex-shrink-0 bg-gold-400 hover:bg-gold-300 disabled:opacity-50 text-navy-950 font-bold px-5 py-2.5 rounded-xl text-sm transition-colors duration-150"
                >
                  {sending ? '…' : 'Send'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </SupportModalShell>
  )
}
