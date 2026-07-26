const MARKUP = (
  <>
    <defs>
      <linearGradient id="brand-bg" x1="4" y1="28" x2="28" y2="4" gradientUnits="userSpaceOnUse">
        <stop stopColor="#2563eb" />
        <stop offset="1" stopColor="#7c3aed" />
      </linearGradient>
      <linearGradient id="brand-line" x1="6" y1="22" x2="26" y2="8" gradientUnits="userSpaceOnUse">
        <stop stopColor="#ffffff" stopOpacity="0.5" />
        <stop offset="1" stopColor="#ffffff" stopOpacity="0.95" />
      </linearGradient>
    </defs>
    <rect width="32" height="32" rx="8" fill="url(#brand-bg)" />
    <rect x="7" y="17" width="4" height="9" rx="1" fill="#fff" fillOpacity="0.92" />
    <rect x="8" y="15" width="2" height="2.5" rx="0.5" fill="#34d399" />
    <rect x="14" y="13" width="4" height="13" rx="1" fill="#fff" fillOpacity="0.92" />
    <rect x="15" y="11" width="2" height="2.5" rx="0.5" fill="#34d399" />
    <rect x="21" y="9" width="4" height="17" rx="1" fill="#fff" fillOpacity="0.92" />
    <rect x="22" y="7" width="2" height="2.5" rx="0.5" fill="#34d399" />
    <path
      d="M5.5 21.5 L11.5 16.5 L17.5 17.5 L26.5 9"
      stroke="url(#brand-line)"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </>
);

/** Brand mark — candlesticks + trend line on gradient square */
export default function BrandLogo({ size = 32, className = '', title = 'Stock Analyzer' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label={title}
    >
      {MARKUP}
    </svg>
  );
}

/** Wordmark lockup: icon + text */
export function BrandLockup({ iconSize = 36, subtitle = 'Global Markets', className = '' }) {
  return (
    <div className={`flex items-center gap-2.5 sm:gap-3 min-w-0 ${className}`}>
      <BrandLogo size={iconSize} className="shrink-0 drop-shadow-lg" />
      <div className="min-w-0">
        <p className="text-sm sm:text-base font-bold text-foreground truncate leading-tight">
          <span className="text-gradient">Stock</span> Analyzer
        </p>
        {subtitle && (
          <p className="text-[9px] text-muted font-mono uppercase tracking-widest truncate">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
