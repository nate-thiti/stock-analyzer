import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { LogIn, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BrandLockup } from '../components/BrandLogo';
import SupportButton from '../components/SupportButton';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/';

  useEffect(() => {
    if (user) navigate(from, { replace: true });
  }, [user, from, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'เข้าสู่ระบบไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-foreground flex items-center justify-center p-4 relative">
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block group">
            <BrandLockup iconSize={44} className="justify-center group-hover:scale-[1.02] transition-transform duration-300" />
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-6 space-y-5">
          <div className="text-center">
            <h2 className="text-lg font-bold text-foreground flex items-center justify-center gap-2">
              <LogIn size={20} className="text-primary" />
              เข้าสู่ระบบ
            </h2>
            <p className="text-xs text-muted mt-1">เข้าสู่ระบบด้วยอีเมลและรหัสผ่าน</p>
          </div>

          {error && (
            <div className="bg-danger/5 border border-danger/25 rounded-xl p-3 flex items-center gap-2 text-sm text-danger">
              <AlertTriangle size={16} className="shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-muted uppercase">อีเมล</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full mt-1 bg-surface border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted uppercase">รหัสผ่าน</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full mt-1 bg-surface border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-gradient-primary border border-primary rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? 'กำลังเข้าสู่ระบบ...' : (
              <>
                <LogIn size={16} />
                เข้าสู่ระบบ
              </>
            )}
          </button>

          <p className="text-center text-xs text-muted">
            ยังไม่มีบัญชี?{' '}
            <Link to="/register" state={location.state} className="text-primary hover:underline">
              สมัครสมาชิก
            </Link>
          </p>
        </form>

        <div className="mt-6 flex justify-center">
          <SupportButton />
        </div>
      </div>
    </div>
  );
}
