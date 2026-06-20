const badges = [
  { label: 'Direct Seller',          detail: 'No broker fees or markups' },
  { label: '150-Point Inspected',    detail: 'Full yard inspection on every machine' },
  { label: 'Wire Transfer Ready',    detail: 'Bank wire & Letter of Credit accepted' },
  { label: 'KYC-Verified Community', detail: 'All buyers are identity-verified' },
]

export default function ConfidenceBadges({ className = '' }: { className?: string }) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${className}`}>
      {badges.map(({ label, detail }) => (
        <div
          key={label}
          className="flex items-start gap-3 bg-navy-800 border border-white/8 rounded-xl px-4 py-3.5 hover:border-white/15 transition-colors duration-150"
        >
          <span className="mt-0.5 text-gold-500 font-bold text-sm flex-shrink-0">✓</span>
          <div>
            <p className="text-xs font-semibold text-white">{label}</p>
            <p className="text-xs text-white/35 mt-0.5">{detail}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
