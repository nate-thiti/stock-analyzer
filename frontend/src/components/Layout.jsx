import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  BarChart3, GitCompare, Home, Star, Shield,
  LogOut, User, Menu, X, Briefcase,
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import SupportButton from './SupportButton';
import { BrandLockup } from './BrandLogo';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { pathname } = useLocation();
  const { user, logout, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const nav = [
    { to: '/', label: 'หน้าแรก', icon: Home },
    { to: '/portfolio', label: 'พอร์ต', icon: Briefcase },
    { to: '/favorites', label: 'ติดดาว', icon: Star },
    { to: '/compare', label: 'เปรียบเทียบ', icon: GitCompare },
  ];

  const adminLink = isSuperAdmin
    ? { to: '/admin', label: 'จัดการผู้ใช้', icon: Shield }
    : null;

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
    <div className="min-h-screen bg-transparent text-foreground font-sans antialiased relative">
      <header
        className="sticky top-0 z-50 border-b border-border backdrop-blur-xl transition-all duration-400"
        style={{ background: 'var(--header-bg)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <Link to="/" className="shrink-0 min-w-0 group">
            <BrandLockup
              iconSize={36}
              className="group-hover:scale-[1.02] transition-transform duration-300"
            />
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-2 lg:gap-3 shrink-0">
            <nav className="flex items-center gap-1">
              {nav.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className={navLinkClass(pathname === to, 'text-xs px-3 py-2')}
                >
                  <Icon size={14} className="icon-animate shrink-0" />
                  <span>{label}</span>
                </Link>
              ))}
              {adminLink && (
                <Link to={adminLink.to} className={adminLinkClass(pathname === adminLink.to, 'text-xs px-3 py-2')}>
                  <adminLink.icon size={14} />
                  <span>{adminLink.label}</span>
                </Link>
              )}
            </nav>

            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-surface/60 border border-border/40 text-[10px] text-muted">
              <User size={12} />
              {user?.username}
            </div>

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

          {/* Mobile: support + theme + hamburger */}
          <div className="flex md:hidden items-center gap-2 shrink-0">
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
        <div className="fixed inset-0 z-40 md:hidden">
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

            <SupportButton className="w-full justify-center mt-2" />

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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 page-enter relative z-10">
        <Outlet />
      </main>

      <footer className="relative z-10 border-t border-border/40 py-4 text-center text-[10px] text-muted backdrop-blur-sm px-4">
        <BarChart3 size={12} className="inline mr-1 text-primary" />
        ข้อมูลจาก Yahoo Finance • คำนวณ P/E, PEG, P/S โดยระบบ • ใช้เพื่อการศึกษา
      </footer>
    </div>
  );
}
