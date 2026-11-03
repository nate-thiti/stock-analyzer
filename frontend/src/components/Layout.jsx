import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  BarChart3, GitCompare, Home, Star, Shield, Search, ChevronDown,
  LogOut, User, Menu, X, Briefcase, Bell, BookOpen, Settings,
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import SupportButton from './SupportButton';
import SearchPalette, { Kbd } from './SearchPalette';
import { BrandLockup } from './BrandLogo';
import { useAuth } from '../context/AuthContext';
import { usePriceAlerts } from '../hooks/usePriceAlerts';

// เมนูหลัก — แสดงบน header (จอใหญ่) และแถบล่าง (มือถือ)
const PRIMARY_NAV = [
  { to: '/', label: 'หน้าแรก', icon: Home },
  { to: '/portfolio', label: 'พอร์ต', icon: Briefcase },
  { to: '/favorites', label: 'ติดดาว', icon: Star },
  { to: '/alerts', label: 'แจ้งเตือน', icon: Bell },
  { to: '/compare', label: 'เปรียบเทียบ', icon: GitCompare },
];

// เมนูรอง — อยู่ในเมนูผู้ใช้ (จอใหญ่) และเมนูแฮมเบอร์เกอร์ (มือถือ)
const SECONDARY_NAV = [
  { to: '/settings', label: 'ตั้งค่า', icon: Settings },
  { to: '/guide', label: 'คู่มือการใช้งาน', icon: BookOpen },
];

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

function isActivePath(pathname, to) {
  return to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(`${to}/`);
}

function isTypingTarget(el) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

function AlertCount({ count, className = '' }) {
  if (!count) return null;
  return (
    <span className={`min-w-[18px] h-[18px] px-1 rounded-full bg-warning text-xs font-bold leading-none text-background flex items-center justify-center ${className}`}>
      {count > 9 ? '9+' : count}
    </span>
  );
}

export default function Layout() {
  const { pathname } = useLocation();
  const { user, logout, isSuperAdmin } = useAuth();
  const { triggered } = usePriceAlerts();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const userMenuRef = useRef(null);
  const alertCount = triggered.length;

  const secondaryNav = isSuperAdmin
    ? [...SECONDARY_NAV, { to: '/admin', label: 'จัดการผู้ใช้', icon: Shield, admin: true }]
    : SECONDARY_NAV;

  useEffect(() => {
    setMenuOpen(false);
    setUserMenuOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  // คีย์ลัดค้นหา: Ctrl/⌘+K ได้ทุกที่, "/" เมื่อไม่ได้พิมพ์อยู่ในช่องอื่น
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((v) => !v);
      } else if (e.key === '/' && !isTypingTarget(e.target)) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!userMenuOpen) return undefined;
    const onDown = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setUserMenuOpen(false); };
    document.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [userMenuOpen]);

  const handleLogout = async () => {
    setMenuOpen(false);
    setUserMenuOpen(false);
    await logout();
    navigate('/login');
  };

  const navLinkClass = (active, admin = false, extra = '') => {
    const activeTone = admin
      ? 'bg-warning/15 text-warning border border-warning/30'
      : 'bg-primary/15 text-primary border border-primary/30';
    return `flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-200 ${extra} ${
      active ? activeTone : 'text-muted hover:text-foreground hover:bg-surface/80 border border-transparent'
    }`;
  };

  return (
    <div className="min-h-dvh w-full max-w-[100vw] overflow-x-clip bg-transparent text-foreground font-sans antialiased relative flex flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-xl focus:bg-primary focus:px-4 focus:py-2 focus:text-white"
      >
        ข้ามไปเนื้อหาหลัก
      </a>

      <header
        className="sticky top-0 z-50 border-b border-border backdrop-blur-xl transition-all duration-400 shrink-0"
        style={{ background: 'var(--header-bg)' }}
      >
        <div className="max-w-[1440px] mx-auto w-full min-w-0 px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 flex items-center gap-2 sm:gap-3">
          <Link to="/" className="shrink-0 min-w-0 group" aria-label="Stock Analyzer หน้าแรก">
            <BrandLockup
              iconSize={32}
              className="group-hover:scale-[1.02] transition-transform duration-300"
            />
          </Link>

          {/* Desktop nav — เมนูหลักมีชื่อกำกับเสมอ */}
          <nav className="hidden xl:flex items-center gap-1 ml-4 min-w-0" aria-label="เมนูหลัก">
            {PRIMARY_NAV.map(({ to, label, icon: Icon }) => {
              const active = isActivePath(pathname, to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={navLinkClass(active, false, 'relative px-3 py-2 whitespace-nowrap')}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon size={15} className="shrink-0" />
                  <span>{label}</span>
                  {to === '/alerts' && <AlertCount count={alertCount} className="ml-0.5" />}
                </Link>
              );
            })}
          </nav>

          <div className="flex-1" />

          {/* ค้นหา — ปุ่มเต็มบนจอใหญ่ */}
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="hidden md:flex items-center gap-2 h-10 w-56 2xl:w-72 shrink-0 rounded-xl border border-border/70 bg-surface/60 pl-3 pr-2 text-sm text-muted hover:border-primary/40 hover:text-foreground transition-colors"
            aria-label="ค้นหาหุ้น"
          >
            <Search size={16} className="shrink-0" />
            <span className="flex-1 text-left truncate">ค้นหาหุ้น...</span>
            <span className="flex items-center gap-0.5 shrink-0">
              <Kbd>{isMac ? '⌘' : 'Ctrl'}</Kbd><Kbd>K</Kbd>
            </span>
          </button>
          {/* ค้นหา — ไอคอนบนมือถือ */}
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="md:hidden p-2 rounded-xl border border-border/60 bg-surface/60 text-foreground hover:border-primary/40 transition-colors"
            aria-label="ค้นหาหุ้น"
          >
            <Search size={20} />
          </button>

          <SupportButton compact />
          <ThemeToggle />

          {/* เมนูผู้ใช้ (จอใหญ่) */}
          <div ref={userMenuRef} className="relative hidden xl:block shrink-0">
            <button
              type="button"
              onClick={() => setUserMenuOpen((v) => !v)}
              className={`flex items-center gap-2 h-10 pl-2 pr-2.5 rounded-xl border text-sm transition-colors ${
                userMenuOpen || secondaryNav.some(({ to }) => isActivePath(pathname, to))
                  ? 'border-primary/40 bg-primary/10 text-foreground'
                  : 'border-border/60 bg-surface/60 text-muted hover:text-foreground hover:border-primary/40'
              }`}
              aria-haspopup="menu"
              aria-expanded={userMenuOpen}
            >
              <span className="w-6 h-6 rounded-lg bg-gradient-primary text-white flex items-center justify-center text-xs font-bold uppercase">
                {user?.username?.[0] || <User size={12} />}
              </span>
              <span className="max-w-[120px] truncate">{user?.username}</span>
              <ChevronDown size={14} className={`transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {userMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full mt-2 w-60 rounded-2xl border border-border/70 bg-card/95 backdrop-blur-xl p-2 shadow-2xl animate-fadeIn"
              >
                <div className="px-3 py-2 mb-1 border-b border-border/50">
                  <p className="text-sm font-semibold text-foreground truncate">{user?.username}</p>
                  {user?.email && <p className="text-xs text-muted truncate">{user.email}</p>}
                </div>
                {secondaryNav.map(({ to, label, icon: Icon, admin }) => (
                  <Link
                    key={to}
                    to={to}
                    role="menuitem"
                    className={navLinkClass(isActivePath(pathname, to), admin, 'w-full py-2')}
                  >
                    <Icon size={16} className="shrink-0" />
                    {label}
                  </Link>
                ))}
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  className="mt-1 w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-danger hover:bg-danger/10 transition-colors"
                >
                  <LogOut size={16} />
                  ออกจากระบบ
                </button>
              </div>
            )}
          </div>

          {/* Mobile / tablet hamburger */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="xl:hidden p-2 rounded-xl border border-border/60 bg-surface/60 text-foreground hover:border-primary/40 transition-colors"
            aria-label={menuOpen ? 'ปิดเมนู' : 'เปิดเมนู'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
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
            className="absolute top-[64px] left-0 right-0 mx-3 rounded-2xl border border-border/60 glass-card p-3 shadow-2xl animate-fadeIn max-h-[calc(100dvh-88px)] overflow-y-auto"
            aria-label="เมนูทั้งหมด"
          >
            <div className="flex items-center gap-2 px-3 py-2 mb-2 rounded-xl bg-surface/60 border border-border/40 text-sm text-muted">
              <User size={14} className="shrink-0" />
              <span className="truncate">{user?.username}</span>
            </div>

            <div className="space-y-1">
              {[...PRIMARY_NAV, ...secondaryNav].map(({ to, label, icon: Icon, admin }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMenuOpen(false)}
                  className={navLinkClass(isActivePath(pathname, to), admin, 'w-full')}
                >
                  <Icon size={18} className="shrink-0" />
                  <span className="flex-1">{label}</span>
                  {to === '/alerts' && <AlertCount count={alertCount} />}
                </Link>
              ))}
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

      <main
        id="main-content"
        className="relative z-10 mx-auto w-full min-w-0 max-w-[1440px] flex-1 px-3 pb-28 pt-4 sm:px-4 sm:pt-6 lg:px-6 xl:pb-6 page-enter"
      >
        <Outlet />
      </main>

      {!menuOpen && <nav
        className="fixed inset-x-2 bottom-2 z-50 grid grid-cols-5 rounded-2xl border border-border/70 bg-card/90 p-1.5 shadow-2xl shadow-black/20 backdrop-blur-2xl xl:hidden"
        style={{ paddingBottom: 'max(0.375rem, env(safe-area-inset-bottom))' }}
        aria-label="เมนูหลักบนมือถือ"
      >
        {PRIMARY_NAV.map(({ to, label, icon: Icon }) => {
          const active = isActivePath(pathname, to);
          return (
            <Link
              key={to}
              to={to}
              className={`relative flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-xs font-medium transition-colors ${
                active ? 'bg-primary/12 text-primary' : 'text-muted hover:bg-surface hover:text-foreground'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={18} strokeWidth={active ? 2.5 : 2} />
              <span className="max-w-full truncate">{label}</span>
              {to === '/alerts' && <AlertCount count={alertCount} className="absolute right-[18%] top-1" />}
            </Link>
          );
        })}
      </nav>}

      <footer className="relative z-10 mb-20 shrink-0 border-t border-border/40 px-3 py-3 text-center text-xs leading-relaxed text-muted backdrop-blur-sm sm:px-4 sm:py-4 sm:text-sm xl:mb-0">
        <BarChart3 size={12} className="inline mr-1 text-primary" />
        ข้อมูลจาก Yahoo Finance • ใช้เพื่อการศึกษา •{' '}
        <Link to="/guide" className="text-primary hover:underline">คู่มือการใช้งาน</Link>
      </footer>

      <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
