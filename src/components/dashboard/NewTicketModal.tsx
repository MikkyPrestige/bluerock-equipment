'use client'

import { useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  SUPPORT_BUCKET,
  SUPPORT_FILE_MAX_BYTES,
  SUPPORT_FILE_MAX_COUNT,
  SUPPORT_ALLOWED_TYPES,
  type SupportTicket,
} from '@/lib/support'
import SupportModalShell from './SupportModalShell'

const INP = [
  'w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-navy-900',
  'placeholder:text-slate-400 focus:outline-none focus:border-gold-400/60',
  'focus:ring-2 focus:ring-gold-400/12 transition-all duration-150',
].join(' ')

const LBL = 'block text-[11px] font-bold text-white/45 uppercase tracking-widest mb-2'

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_')
}

export default function NewTicketModal({
  buyerId,
  onClose,
  onCreated,
}: {
  buyerId: string
  onClose: () => void
  onCreated: (ticket: SupportTicket) => void
}) {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [fileError, setFileError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setFileError('')

    const incoming = Array.from(files)
    const accepted: File[] = []

    for (const file of incoming) {
      if (!SUPPORT_ALLOWED_TYPES.includes(file.type)) {
        setFileError(`${file.name}: unsupported file type. Use JPG, PNG, WebP, or PDF.`)
        continue
      }
      if (file.size > SUPPORT_FILE_MAX_BYTES) {
        setFileError(`${file.name}: file exceeds ${SUPPORT_FILE_MAX_BYTES / (1024 * 1024)}MB limit.`)
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

  function removePending(index: number) {
    setPendingFiles(prev => prev.filter((_, i) => i !== index))
  }

  const onDragOver  = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true) }, [])
  const onDragLeave = useCallback(() => setIsDragOver(false), [])
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    addFiles(e.dataTransfer.files)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!subject.trim() || !message.trim()) return

    setSubmitting(true)
    setSubmitError('')

    try {
      const { data: ticket, error: ticketErr } = await supabase
        .from('support_tickets')
        .insert({ buyer_id: buyerId, subject: subject.trim() })
        .select()
        .single()

      if (ticketErr || !ticket) {
        setSubmitError('We couldn’t create your ticket. Please try again.')
        setSubmitting(false)
        return
      }

      const messageFolder = crypto.randomUUID()
      const uploadedPaths: string[] = []

      for (const file of pendingFiles) {
        const path = `${buyerId}/${messageFolder}/${sanitizeFileName(file.name)}`
        const { error: uploadErr } = await supabase.storage
          .from(SUPPORT_BUCKET)
          .upload(path, file, { contentType: file.type, upsert: false })

        if (uploadErr) {
          setSubmitError('One of your attachments failed to upload. Please remove it and try again.')
          setSubmitting(false)
          return
        }
        uploadedPaths.push(path)
      }

      const { data: firstMessage, error: msgErr } = await supabase
        .from('support_messages')
        .insert({
          ticket_id: ticket.id,
          sender_type: 'buyer',
          sender_id: buyerId,
          message: message.trim(),
          file_urls: uploadedPaths,
        })
        .select()
        .single()

      if (msgErr || !firstMessage) {
        setSubmitError('We created your ticket but couldn’t save your message. Please try again.')
        setSubmitting(false)
        return
      }

      // Fire-and-forget — admin email notification must never block or delay ticket creation.
      fetch('/api/support-tickets/notify-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId: firstMessage.id }),
        credentials: 'include',
      }).catch(() => {})

      setSubmitting(false)
      onCreated(ticket)
    } catch {
      setSubmitError('Something went wrong. Please check your connection and try again.')
      setSubmitting(false)
    }
  }

  return (
    <SupportModalShell title="New Support Request" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={LBL}>Subject</label>
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            required
            maxLength={200}
            className={INP}
            placeholder="e.g. Question about my proforma invoice"
            autoFocus
          />
        </div>

        <div>
          <label className={LBL}>Message</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            required
            rows={5}
            className={`${INP} resize-y min-h-[120px]`}
            placeholder="Describe your question or issue in detail…"
          />
        </div>

        {pendingFiles.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {pendingFiles.map((file, i) => (
              <div key={`${file.name}-${i}`} className="flex items-center gap-2 bg-navy-800 border border-white/10 rounded-lg px-3 py-1.5">
                <span className="text-xs text-white/60 max-w-[160px] truncate">{file.name}</span>
                <button type="button" onClick={() => removePending(i)} className="text-red-400/70 hover:text-red-400 text-xs font-semibold">✕</button>
              </div>
            ))}
          </div>
        )}

        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => !submitting && fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl py-8 cursor-pointer transition-colors duration-150 ${
            submitting
              ? 'border-gold-400/30 cursor-not-allowed'
              : isDragOver
                ? 'border-gold-400/60 bg-gold-400/4'
                : 'border-white/15 hover:border-gold-400/40'
          }`}
        >
          <svg className="w-6 h-6 text-white/25" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          <div className="text-center">
            <p className="text-sm font-medium text-white/50">{isDragOver ? 'Drop files here' : 'Attach Files (optional)'}</p>
            <p className="text-xs text-white/25 mt-0.5">
              Drag & drop or click · JPG, PNG, WebP, PDF · up to {SUPPORT_FILE_MAX_COUNT}, 5MB each
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={SUPPORT_ALLOWED_TYPES.join(',')}
            onChange={e => addFiles(e.target.files)}
            disabled={submitting}
            className="hidden"
          />
        </div>

        {fileError && (
          <p className="text-amber-400 text-xs bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-lg">{fileError}</p>
        )}

        {submitError && (
          <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-xl">{submitError}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-gold-400 hover:bg-gold-300 disabled:opacity-60 disabled:cursor-not-allowed text-navy-950 font-bold px-8 py-3 rounded-xl text-sm transition-colors duration-150 shadow-lg shadow-black/20 flex items-center gap-2.5 justify-center"
        >
          {submitting && <span className="w-4 h-4 border-2 border-navy-950/30 border-t-navy-950 rounded-full animate-spin flex-shrink-0" />}
          {submitting ? 'Submitting…' : 'Submit Request'}
        </button>
      </form>
    </SupportModalShell>
  )
}
