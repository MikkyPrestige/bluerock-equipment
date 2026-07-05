'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  SUPPORT_STATUS_LABELS,
  SUPPORT_STATUS_BADGE,
  SUPPORT_FILE_MAX_BYTES,
  SUPPORT_FILE_MAX_COUNT,
  SUPPORT_ALLOWED_TYPES,
  type SupportMessage,
} from '@/lib/support'

const INP = [
  'flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-navy-900',
  'placeholder:text-slate-400 focus:outline-none focus:border-gold-400/60',
  'focus:ring-2 focus:ring-gold-400/12 transition-all duration-150 resize-none',
].join(' ')

function fileNameFromPath(path: string): string {
  const parts = path.split('/')
  return parts[parts.length - 1]
}

export default function AdminThreadClient({
  ticketId,
  initialStatus,
}: {
  ticketId: string
  initialStatus: string
}) {
  const supabase = createClient()
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState(initialStatus)

  const [reply, setReply] = useState('')
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [fileError, setFileError] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [actionBusy, setActionBusy] = useState<'resolve' | 'close' | 'reopen' | null>(null)
  const [downloadingPath, setDownloadingPath] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data } = await supabase
        .from('support_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true })
      if (!cancelled) {
        setMessages((data ?? []) as SupportMessage[])
        setLoading(false)
      }
    }
    load()

    const channel = supabase
      .channel(`admin_support_messages:${ticketId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `ticket_id=eq.${ticketId}` },
        payload => {
          const msg = payload.new as SupportMessage
          setMessages(prev => (prev.some(m => m.id === msg.id) ? prev : [...prev, msg]))
        }
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId])

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

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!reply.trim() && pendingFiles.length === 0) return
    setSending(true)
    setSendError('')
    try {
      const formData = new FormData()
      formData.set('message', reply.trim())
      for (const file of pendingFiles) formData.append('files', file)

      const res = await fetch(`/api/admin/support-tickets/${ticketId}/reply`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })
      const json = await res.json()
      if (!res.ok) { setSendError(json.error ?? 'Failed to send reply'); setSending(false); return }
      setStatus('replied')
      setReply('')
      setPendingFiles([])
      setSending(false)
    } catch {
      setSendError('Network error')
      setSending(false)
    }
  }

  async function runAction(action: 'resolve' | 'close' | 'reopen') {
    setActionBusy(action)
    try {
      const res = await fetch(`/api/admin/support-tickets/${ticketId}/${action}`, { method: 'POST', credentials: 'include' })
      if (res.ok) {
        if (action === 'resolve') setStatus('resolved')
        if (action === 'close') setStatus('closed')
        if (action === 'reopen') setStatus('open')
      }
    } finally {
      setActionBusy(null)
    }
  }

  async function handleView(path: string) {
    setDownloadingPath(path)
    try {
      const res = await fetch('/api/admin/support-tickets/attachment-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
        credentials: 'include',
      })
      const json = await res.json()
      if (res.ok && json.url) window.open(json.url, '_blank', 'noopener')
    } finally {
      setDownloadingPath(null)
    }
  }

  const badge = SUPPORT_STATUS_BADGE[status] ?? 'bg-white/8 border-white/12 text-white/40'
  const label = SUPPORT_STATUS_LABELS[status] ?? status

  return (
    <div className="bg-navy-900 border border-white/8 rounded-2xl flex flex-col overflow-hidden">

      {/* Actions bar */}
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-white/8 flex-wrap">
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wide ${badge}`}>
          {label}
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          {status !== 'resolved' && (
            <button
              onClick={() => runAction('resolve')}
              disabled={actionBusy !== null}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 disabled:opacity-50 border border-emerald-500/25 hover:border-emerald-500/45 px-3 py-1.5 rounded-lg transition-all duration-150"
            >
              {actionBusy === 'resolve' ? 'Marking…' : 'Mark Resolved'}
            </button>
          )}
          {status === 'closed' || status === 'resolved' ? (
            <button
              onClick={() => runAction('reopen')}
              disabled={actionBusy !== null}
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 disabled:opacity-50 border border-blue-500/25 hover:border-blue-500/45 px-3 py-1.5 rounded-lg transition-all duration-150"
            >
              {actionBusy === 'reopen' ? 'Reopening…' : 'Reopen'}
            </button>
          ) : (
            <button
              onClick={() => runAction('close')}
              disabled={actionBusy !== null}
              className="text-xs font-semibold text-white/40 hover:text-red-400 disabled:opacity-50 border border-white/12 hover:border-red-500/40 px-3 py-1.5 rounded-lg transition-all duration-150"
            >
              {actionBusy === 'close' ? 'Closing…' : 'Close Ticket'}
            </button>
          )}
        </div>
      </div>

      {/* Thread */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3 min-h-[320px] max-h-[520px]">
        {loading ? (
          <p className="text-white/25 text-sm text-center py-8">Loading…</p>
        ) : messages.length === 0 ? (
          <p className="text-white/25 text-sm text-center py-8">No messages yet.</p>
        ) : (
          messages.map(msg => {
            const isAdmin = msg.sender_type === 'admin'
            return (
              <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                  isAdmin ? 'bg-gold-400/15 border border-gold-400/25' : 'bg-navy-800 border border-white/8'
                }`}>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1 text-white/30">
                    {isAdmin ? 'You (Admin)' : 'Buyer'}
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
      <div className="border-t border-white/8 px-5 py-4">
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
          {sendError && <p className="text-red-400 text-[11px]">{sendError}</p>}
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
              value={reply}
              onChange={e => setReply(e.target.value)}
              rows={1}
              placeholder="Write a reply…"
              className={INP}
            />
            <button
              type="submit"
              disabled={sending || (!reply.trim() && pendingFiles.length === 0)}
              className="flex-shrink-0 bg-gold-400 hover:bg-gold-300 disabled:opacity-50 text-navy-950 font-bold px-5 py-2.5 rounded-xl text-sm transition-colors duration-150"
            >
              {sending ? '…' : 'Send'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
