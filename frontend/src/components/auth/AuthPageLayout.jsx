import { lazy, Suspense, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DatabaseZap, Globe2, ShieldCheck, Sparkles } from 'lucide-react';
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

function VisualPanel({ tagline, description, sceneVariant }) {
  return (
    <div className="relative overflow-hidden min-h-dvh">
      <SoftOrbs />
      <Suspense fallback={<SceneFallback />}>
        <AuthScene3D variant={sceneVariant} className="absolute inset-0 z-0" />
      </Suspense>
      <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/15 to-background/40 pointer-events-none z-[1]" />
      <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-background/30 pointer-events-none z-[1]" />

      <div className="relative z-10 h-full min-h-dvh flex flex-col items-center justify-between text-center px-8 xl:px-10 py-10 pointer-events-none">
        <div className="flex items-center gap-1.5 text-xs text-muted/90 mt-2">
          <Globe2 size={12} className="text-primary/80" />
          {MARKETS.map((m, i) => (
            <span key={m}>
              {i > 0 && <span className="mx-1 opacity-40">·</span>}
              {m}
            </span>
          ))}
        </div>

        <div className="flex-1" aria-hidden="true" />

        <div className="pb-5">
          <div className="mx-auto mb-3 inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-background/45 px-3 py-1 text-xs font-medium text-primary backdrop-blur-xl">
            <Sparkles size={13} /> Interactive market intelligence
          </div>
          <h2 className="max-w-[24rem] text-2xl font-black leading-tight text-foreground xl:text-4xl">
            {tagline}
          </h2>
          <p className="mx-auto mt-3 max-w-[25rem] text-sm leading-relaxed text-muted">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

function MobileVisual({ sceneVariant }) {
  return (
    <div className="relative mb-5 h-44 overflow-hidden rounded-3xl border border-primary/20 bg-primary/[0.04] sm:h-52 lg:hidden">
      <Suspense fallback={<SceneFallback />}>
        <AuthScene3D compact variant={sceneVariant} className="absolute inset-0" />
      </Suspense>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/55 via-transparent to-transparent" />
      <div className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-background/60 px-2.5 py-1 text-xs font-medium text-primary backdrop-blur-xl">
        <Sparkles size={12} /> 3D interactive
      </div>
    </div>
  );
}

export default function AuthPageLayout({
  title,
  subtitle,
  icon: Icon,
  tagline,
  description,
  helperText = 'เข้าถึงข้อมูลวิเคราะห์ พอร์ต และการแจ้งเตือนของคุณ',
  sceneVariant = 'core',
  children,
}) {
  const [isDesktop, setIsDesktop] = useState(() => (
    typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
  ));

  useEffect(() => {
    const query = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsDesktop(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return (
    <div className="relative min-h-dvh w-full min-w-0 overflow-x-clip">
      <SoftOrbs />
      <div className="grid-overlay pointer-events-none absolute inset-0 opacity-50" />
      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-30">
        <ThemeToggle />
      </div>

      <div className="lg:grid lg:min-h-dvh lg:grid-cols-[0.88fr_1.12fr]">
        <div className="relative z-10 flex min-h-dvh flex-col items-center justify-center px-4 py-8 sm:px-8 lg:min-h-0 lg:py-12">
          <div className="w-full max-w-[430px]">
            <div className="mb-6 flex justify-center lg:mb-8">
              <Link to="/" className="inline-block opacity-90 hover:opacity-100 transition-opacity">
                <BrandLockup iconSize={40} />
              </Link>
            </div>

            {!isDesktop && <MobileVisual sceneVariant={sceneVariant} />}

            <div className="glass rounded-3xl p-5 shadow-2xl shadow-primary/5 sm:p-8">
              <div className="mb-6">
                <div className="mb-2 flex items-center gap-2 text-primary">
                  <span className="grid h-8 w-8 place-items-center rounded-xl border border-primary/20 bg-primary/10">
                    <Icon size={16} />
                  </span>
                  <span className="text-xs font-bold uppercase tracking-[0.14em]">{title}</span>
                </div>
                <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">{subtitle}</h1>
                <p className="mt-1.5 text-sm text-muted">{helperText}</p>
              </div>

              <div className="space-y-5">{children}</div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[11px] text-muted">
              <span className="inline-flex items-center justify-center gap-1 rounded-xl border border-border/50 bg-surface/40 px-2 py-2">
                <ShieldCheck size={12} className="text-success" /> ปลอดภัย
              </span>
              <span className="inline-flex items-center justify-center gap-1 rounded-xl border border-border/50 bg-surface/40 px-2 py-2">
                <DatabaseZap size={12} className="text-primary" /> Cache เร็ว
              </span>
              <span className="inline-flex items-center justify-center gap-1 rounded-xl border border-border/50 bg-surface/40 px-2 py-2">
                <Globe2 size={12} className="text-accent" /> หุ้นทั่วโลก
              </span>
            </div>
          </div>
        </div>

        {isDesktop && (
          <div className="border-l border-border/30">
            <VisualPanel tagline={tagline} description={description} sceneVariant={sceneVariant} />
          </div>
        )}
      </div>
    </div>
  );
}
