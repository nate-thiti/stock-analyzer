import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { Globe2 } from 'lucide-react';
import { BrandLockup } from '../BrandLogo';
import ThemeToggle from '../ThemeToggle';

const AuthScene3D = lazy(() => import('./AuthScene3D'));

const MARKETS = ['ไทย SET', 'US', 'HK', 'CN'];

function SoftOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <div className="orb orb-1 opacity-60 scale-[0.7]" />
      <div className="orb orb-2 opacity-50 scale-90 translate-x-1/3" />
    </div>
  );
}

function SceneFallback() {
  return (
    <div className="w-full h-full bg-gradient-to-br from-primary/10 via-background to-accent/10" aria-hidden="true" />
  );
}

function VisualPanel({ tagline }) {
  return (
    <div className="relative overflow-hidden min-h-dvh">
      <SoftOrbs />
      <Suspense fallback={<SceneFallback />}>
        <AuthScene3D className="absolute inset-0 z-0" />
      </Suspense>
      <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/15 to-background/40 pointer-events-none z-[1]" />
      <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-background/30 pointer-events-none z-[1]" />

      <div className="relative z-10 h-full min-h-dvh flex flex-col items-center justify-between text-center px-8 xl:px-10 py-10 pointer-events-none">
        <div className="flex items-center gap-1.5 text-[10px] text-muted/90 mt-2">
          <Globe2 size={12} className="text-primary/80" />
          {MARKETS.map((m, i) => (
            <span key={m}>
              {i > 0 && <span className="mx-1 opacity-40">·</span>}
              {m}
            </span>
          ))}
        </div>

        <div className="flex-1" aria-hidden="true" />

        <div className="pb-4">
          <h2 className="text-2xl xl:text-[1.85rem] font-bold text-foreground leading-snug max-w-[20rem]">
            {tagline}
          </h2>
          <p className="text-xs text-muted mt-2 max-w-[18rem] mx-auto leading-relaxed">
            กราฟแท่งเทียน 3D · วิเคราะห์ · พอร์ต · แจ้งเตือนราคา
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AuthPageLayout({
  title,
  subtitle,
  icon: Icon,
  tagline,
  children,
}) {
  return (
    <div className="min-h-dvh w-full min-w-0 overflow-x-clip relative">
      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-30">
        <ThemeToggle />
      </div>

      <div className="lg:grid lg:grid-cols-2 lg:min-h-dvh">
        <div className="relative z-10 flex flex-col justify-center items-center px-4 sm:px-8 py-10 lg:py-12 min-h-dvh lg:min-h-0">
          <div className="w-full max-w-[380px]">
            <div className="flex justify-center mb-8 lg:mb-10">
              <Link to="/" className="inline-block opacity-90 hover:opacity-100 transition-opacity">
                <BrandLockup iconSize={40} />
              </Link>
            </div>

            <div className="mb-6 lg:mb-7 lg:text-center">
              <div className="flex items-center gap-2 text-primary/80 mb-1 lg:justify-center">
                <Icon size={16} />
                <span className="text-[11px] font-medium uppercase tracking-wide">{title}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">{subtitle}</h1>
            </div>

            <div className="space-y-5">{children}</div>
          </div>
        </div>

        <div className="hidden lg:block border-l border-border/30">
          <VisualPanel tagline={tagline} />
        </div>
      </div>
    </div>
  );
}
