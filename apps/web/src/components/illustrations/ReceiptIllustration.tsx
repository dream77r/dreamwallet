export function ReceiptIllustration({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M32 20h56a8 8 0 018 8v72l-8-6-8 6-8-6-8 6-8-6-8 6-8-6-8 6V28a8 8 0 018-8z" className="fill-primary/5 stroke-primary/20" strokeWidth="1.5" />
      <rect x="42" y="36" width="36" height="3" rx="1.5" className="fill-primary/25" />
      <rect x="42" y="46" width="28" height="3" rx="1.5" className="fill-primary/15" />
      <rect x="42" y="56" width="32" height="3" rx="1.5" className="fill-primary/20" />
      <line x1="42" y1="68" x2="78" y2="68" className="stroke-primary/15" strokeDasharray="3 3" />
      <rect x="42" y="74" width="20" height="4" rx="2" className="fill-primary/30" />
      <rect x="66" y="74" width="12" height="4" rx="2" className="fill-primary/50" />
    </svg>
  )
}
