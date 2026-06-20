const badges = [
  {
    label: 'Direct Seller',
    detail: 'No broker fees or markups',
  },
  {
    label: '150-Point Inspected',
    detail: 'Full yard inspection on every machine',
  },
  {
    label: 'Wire Transfer Ready',
    detail: 'Bank wire & Letter of Credit accepted',
  },
  {
    label: 'KYC-Verified Community',
    detail: 'All buyers are identity-verified',
  },
]

export default function ConfidenceBadges({ className = '' }: { className?: string }) {
  return (
    <div className={`grid grid-cols-2 gap-3 ${className}`}>
      {badges.map(({ label, detail }) => (
        <div
          key={label}
          className="flex items-start gap-2 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3"
        >
          <span className="mt-0.5 text-green-600 font-bold text-sm flex-shrink-0">✓</span>
          <div>
            <p className="text-xs font-semibold text-gray-800">{label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{detail}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
