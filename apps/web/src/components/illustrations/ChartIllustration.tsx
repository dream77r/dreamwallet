export function ChartIllustration({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="16" y="24" width="88" height="72" rx="12" className="fill-primary/5" />
      <rect x="28" y="64" width="12" height="24" rx="3" className="fill-primary/20" />
      <rect x="46" y="48" width="12" height="40" rx="3" className="fill-primary/30" />
      <rect x="64" y="56" width="12" height="32" rx="3" className="fill-primary/25" />
      <rect x="82" y="40" width="12" height="48" rx="3" className="fill-primary/40" />
      <path d="M34 60 L52 44 L70 52 L88 36" className="stroke-primary/60" strokeWidth="2" strokeLinecap="round" />
      <circle cx="34" cy="60" r="3" className="fill-primary" />
      <circle cx="52" cy="44" r="3" className="fill-primary" />
      <circle cx="70" cy="52" r="3" className="fill-primary" />
      <circle cx="88" cy="36" r="3" className="fill-primary" />
    </svg>
  )
}
