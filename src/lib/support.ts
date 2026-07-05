export const SUPPORT_BUCKET = 'support-files'

export const SUPPORT_STATUS_LABELS: Record<string, string> = {
  open:     'Open',
  replied:  'Replied',
  resolved: 'Resolved',
  closed:   'Closed',
}

export const SUPPORT_STATUS_BADGE: Record<string, string> = {
  open:     'bg-amber-500/20 border-amber-500/30 text-amber-400',
  replied:  'bg-blue-500/20 border-blue-500/30 text-blue-400',
  resolved: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400',
  closed:   'bg-white/8 border-white/12 text-white/40',
}

export const SUPPORT_STATUSES = ['open', 'replied', 'resolved', 'closed'] as const

/* Client-side upload guardrails — keeps a single message's attachments small
   relative to the shared 500MB Supabase free-tier storage ceiling. */
export const SUPPORT_FILE_MAX_BYTES = 5 * 1024 * 1024
export const SUPPORT_FILE_MAX_COUNT = 5
export const SUPPORT_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

export type SupportTicket = {
  id: string
  buyer_id: string
  subject: string
  status: string
  closed_by: 'buyer' | 'admin' | null
  buyer_last_read_at: string | null
  admin_last_read_at: string | null
  created_at: string
  updated_at: string
}

export type SupportMessage = {
  id: string
  ticket_id: string
  sender_type: 'buyer' | 'admin'
  sender_id: string
  message: string
  file_urls: string[]
  created_at: string
}
