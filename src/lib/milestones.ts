export const MILESTONE_PHASES = [
  { phase: 0, label: 'Quote Requested',    description: 'Delivery quote submitted by buyer' },
  { phase: 1, label: 'Proforma Issued',    description: 'Invoice ready — please review pricing' },
  { phase: 2, label: 'Buyer Accepted',     description: 'Terms accepted, deposit confirmed' },
  { phase: 3, label: 'Payment Confirmed',  description: 'Full payment received' },
  { phase: 4, label: 'Export Docs Issued', description: 'B/L, certificates and packing list ready' },
  { phase: 5, label: 'In Transit',         description: 'Equipment shipped to destination port' },
  { phase: 6, label: 'Delivered',          description: 'Equipment delivered and accepted' },
] as const

// Statuses under which a quote is still genuinely holding its machine —
// matches quotes_one_active_per_buyer_machine's predicate exactly. Shared by
// every place that needs to answer "is this quote still live": the
// buyer-cancel route (releases the machine only when cancelling from one of
// these), the admin Holds/Watchdog release action, and the Holds page's
// orphaned-vs-active determination. A second inline copy of this list is
// exactly how the pending_hold-forever bug happened — the cancel route only
// ever checked for 'pending_quote'.
export const ACTIVE_QUOTE_STATUSES = [
  'pending_quote',
  'invoice_generated',
  'revision_requested',
  'buyer_accepted',
  'payment_pending',
  'payment_confirmed',
] as const

export const DOC_TYPE_LABELS: Record<string, string> = {
  proforma:         'Proforma Invoice',
  bill_of_lading:   'Bill of Lading',
  export_cert:      'Export Certificate',
  customs_manifest: 'Customs Manifest',
  packing_list:     'Packing List',
  payment_proof:    'Payment Proof',
}

export const TRADE_DOC_TYPES = [
  'bill_of_lading',
  'export_cert',
  'customs_manifest',
  'packing_list',
] as const
