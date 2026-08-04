import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  BarChart3, GitCompare, Home, Star, Shield,
  LogOut, User, Menu, X, Briefcase, Bell, BellRing, BookOpen, Settings,
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import SupportButton from './SupportButton';
import { BrandLockup } from './BrandLogo';
import { useAuth } from '../context/AuthContext';
import { usePriceAlerts } from '../hooks/usePriceAlerts';

export default function Layout() {
  const { pathname } = useLocation();
  const { user, logout, isSuperAdmin } = useAuth();
  const { triggered } = usePriceAlerts();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const nav = [
    { to: '/', label: 'หน้าแรก', icon: Home },
    { to: '/portfolio', label: 'พอร์ต', icon: Briefcase },
    { to: '/favorites', label: 'ติดดาว', icon: Star },
    { to: '/alerts', label: 'แจ้งเตือน', icon: Bell },
    { to: '/compare', label: 'เปรียบเทียบ', icon: GitCompare },
    { to: '/settings', label: 'ตั้งค่า', icon: Settings },
    { to: '/guide', label: 'คู่มือ', icon: BookOpen },
  ];

  const adminLink = isSuperAdmin
    ? { to: '/admin', label: 'จัดการผู้ใช้', icon: Shield }
    : null;

  const bottomNav = nav.filter(({ to }) => (
    ['/', '/portfolio', '/compare', '/favorites', '/alerts'].includes(to)
  ));

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate('/login');
  };

  const navLinkClass = (active, extra = '') =>
    `flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${extra} ${
      active
        ? 'bg-primary/15 text-primary border border-primary/30'
        : 'text-muted hover:text-foreground hover:bg-surface/80 border border-transparent'
    }`;

  const adminLinkClass = (active, extra = '') =>
    `flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${extra} ${
      active
        ? 'bg-warning/15 text-warning border border-warning/30'
        : 'text-muted hover:text-foreground hover:bg-surface/80 border border-transparent'
    }`;

  return (
    <div className="min-h-dvh w-full max-w-[100vw] overflow-x-clip bg-transparent text-foreground font-sans antialiased relative flex flex-col">
      <header
        className="sticky top-0 z-50 border-b border-border backdrop-blur-xl transition-all duration-400 shrink-0"
        style={{ background: 'var(--header-bg)' }}
      >
        <div className="max-w-7xl mx-auto w-full min-w-0 px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-3">
          <Link to="/" className="shrink-0 min-w-0 max-w-[55%] sm:max-w-none group">
            <BrandLockup
              iconSize={32}
              className="group-hover:scale-[1.02] transition-transform duration-300"
            />
          </Link>

          {/* Desktop nav — xl+ เพื่อไม่ให้เมนูเบียดบน tablet */}
          <div className="hidden xl:flex items-center gap-1.5 2xl:gap-2 shrink-0 min-w-0">
            <nav className="flex items-center gap-0.5 2xl:gap-1 min-w-0">
              {nav.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className={navLinkClass(pathname === to, 'text-sm px-2 2xl:px-3 py-2 whitespace-nowrap')}
                  title={label}
                  aria-label={label}
                >
                  <Icon size={14} className="icon-animate shrink-0" />
                  <span className="hidden 2xl:inline">{label}</span>
                </Link>
              ))}
              {adminLink && (
                <Link to={adminLink.to} className={adminLinkClass(pathname === adminLink.to, 'text-sm px-2 2xl:px-3 py-2 whitespace-nowrap')}>
                  <adminLink.icon size={14} />
                  <span className="hidden 2xl:inline">{adminLink.label}</span>
                </Link>
              )}
            </nav>

            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-surface/60 border border-border/40 text-xs sm:text-sm text-muted max-w-[120px] 2xl:max-w-[160px]">
              <User size={12} className="shrink-0" />
              <span className="truncate">{user?.username}</span>
            </div>

            <Link
              to="/alerts"
              className={`relative p-2 rounded-xl transition-colors ${
                pathname === '/alerts'
                  ? 'text-warning bg-warning/10 border border-warning/30'
                  : 'text-muted hover:text-warning hover:bg-warning/10 border border-transparent'
              }`}
              title="แจ้งเตือนราคา"
            >
              {triggered.length > 0 ? (
                <BellRing size={16} className="animate-pulse" />
              ) : (
                <Bell size={16} />
              )}
              {triggered.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-warning text-xs font-bold text-background flex items-center justify-center">
                  {triggered.length > 9 ? '9+' : triggered.length}
                </span>
              )}
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="p-2 rounded-xl text-muted hover:text-danger hover:bg-danger/10 transition-colors"
              title="ออกจากระบบ"
            >
              <LogOut size={16} />
            </button>
            <SupportButton />
            <ThemeToggle />
          </div>

          {/* Mobile / tablet */}
          <div className="flex xl:hidden items-center gap-1.5 sm:gap-2 shrink-0">
            <SupportButton compact />
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="p-2 rounded-xl border border-border/60 bg-surface/60 text-foreground hover:border-primary/40 transition-colors"
              aria-label={menuOpen ? 'ปิดเมนู' : 'เปิดเมนู'}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 xl:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-background/60 backdrop-blur-sm"
            aria-label="ปิดเมนู"
            onClick={() => setMenuOpen(false)}
          />
          <nav
            className="absolute top-[57px] left-0 right-0 mx-3 rounded-2xl border border-border/60 glass-card p-3 shadow-2xl animate-fadeIn max-h-[calc(100vh-80px)] overflow-y-auto"
            aria-label="เมนูหลัก"
          >
            <div className="flex items-center gap-2 px-3 py-2 mb-2 rounded-xl bg-surface/60 border border-border/40 text-sm text-muted">
              <User size={14} className="shrink-0" />
              <span className="truncate">{user?.username}</span>
            </div>

            <div className="space-y-1">
              {nav.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMenuOpen(false)}
                  className={navLinkClass(pathname === to, 'w-full')}
                >
                  <Icon size={18} className="shrink-0" />
                  {label}
                </Link>
              ))}
              {adminLink && (
                <Link
                  to={adminLink.to}
                  onClick={() => setMenuOpen(false)}
                  className={adminLinkClass(pathname === adminLink.to, 'w-full')}
                >
                  <adminLink.icon size={18} />
                  {adminLink.label}
                </Link>
              )}
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-danger border border-danger/30 bg-danger/5 hover:bg-danger/10 transition-colors"
            >
              <LogOut size={16} />
              ออกจากระบบ
            </button>
          </nav>
        </div>
      )}

      <main className="relative z-10 mx-auto w-full min-w-0 max-w-[1440px] flex-1 px-3 pb-28 pt-4 sm:px-4 sm:pt-6 lg:px-6 xl:pb-6 page-enter">
        <Outlet />
      </main>

      {!menuOpen && <nav
        className="fixed inset-x-2 bottom-2 z-50 grid grid-cols-5 rounded-2xl border border-border/70 bg-card/90 p-1.5 shadow-2xl shadow-black/20 backdrop-blur-2xl xl:hidden"
        style={{ paddingBottom: 'max(0.375rem, env(safe-area-inset-bottom))' }}
        aria-label="เมนูหลักบนมือถือ"
      >
        {bottomNav.map(({ to, label, icon: Icon }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={`relative flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[10px] font-medium transition-colors ${
                active ? 'bg-primary/12 text-primary' : 'text-muted hover:bg-surface hover:text-foreground'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={18} strokeWidth={active ? 2.5 : 2} />
              <span className="max-w-full truncate">{label}</span>
              {to === '/alerts' && triggered.length > 0 && (
                <span className="absolute right-[24%] top-1 min-w-4 rounded-full bg-warning px-1 text-[9px] font-black text-background">
                  {triggered.length > 9 ? '9+' : triggered.length}
                </span>
              )}
            </Link>
          );
        })}
      </nav>}

      <footer className="relative z-10 mb-20 shrink-0 border-t border-border/40 px-3 py-3 text-center text-xs leading-relaxed text-muted backdrop-blur-sm sm:px-4 sm:py-4 sm:text-sm xl:mb-0">
        <BarChart3 size={12} className="inline mr-1 text-primary" />
        ข้อมูลจาก Yahoo Finance • ใช้เพื่อการศึกษา •{' '}
        <Link to="/guide" className="text-primary hover:underline">คู่มือการใช้งาน</Link>
      </footer>
    </div>
  );
}
