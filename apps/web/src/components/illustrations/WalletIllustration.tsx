export function WalletIllustration({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="16" y="32" width="88" height="56" rx="12" className="fill-primary/10" />
      <rect x="20" y="36" width="80" height="48" rx="10" className="fill-primary/5 stroke-primary/30" strokeWidth="1.5" />
      <rect x="60" y="50" width="32" height="20" rx="6" className="fill-primary/20" />
      <circle cx="76" cy="60" r="6" className="fill-primary" />
      <rect x="28" y="44" width="24" height="4" rx="2" className="fill-primary/30" />
      <rect x="28" y="52" width="16" height="3" rx="1.5" className="fill-primary/15" />
    </svg>
  )
}
