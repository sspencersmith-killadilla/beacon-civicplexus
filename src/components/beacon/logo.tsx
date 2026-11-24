export function BeaconMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="14" className="fill-primary" />
      <path d="M32 12 L44 46 H20 Z" className="fill-amber" />
      <rect x="16" y="46" width="32" height="6" rx="2" className="fill-primary-foreground" />
      <circle cx="32" cy="26" r="4" className="fill-primary-foreground" />
    </svg>
  );
}
export function BeaconWordmark() {
  return (
    <span className="flex items-center gap-2">
      <BeaconMark />
      <span className="text-lg font-semibold tracking-tight">Beacon</span>
    </span>
  );
}
