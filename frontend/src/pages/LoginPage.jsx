import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { LogIn, AlertTriangle, LockKeyhole, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import PasswordInput from '../components/PasswordInput';
import AuthPageLayout from '../components/auth/AuthPageLayout';

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
    <AuthPageLayout
      title="เข้าสู่ระบบ"
      subtitle="ยินดีต้อนรับกลับ"
      icon={LogIn}
      tagline="ปลุก Market Intelligence ให้ทำงาน"
      description="แกนวิเคราะห์อัจฉริยะเชื่อมราคา แนวโน้ม ความเสี่ยง และพอร์ตของคุณไว้ในมุมมองเดียว"
      helperText="เข้าสู่ระบบเพื่อดูบทวิเคราะห์ พอร์ต และการแจ้งเตือนล่าสุด"
      sceneVariant="core"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="bg-danger/5 border border-danger/25 rounded-xl p-3 flex items-center gap-2 text-sm text-danger" role="alert" aria-live="polite">
            <AlertTriangle size={16} className="shrink-0" />
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label htmlFor="login-email" className="text-xs font-bold text-muted">อีเมล</label>
            <div className="relative mt-1.5">
              <Mail size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null); }}
                required
                autoComplete="email"
                className="auth-input w-full pl-11"
                placeholder="you@example.com"
              />
            </div>
          </div>
          <div>
            <label htmlFor="login-password" className="text-xs font-bold text-muted">รหัสผ่าน</label>
            <PasswordInput
              id="login-password"
              leadingIcon={LockKeyhole}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null); }}
              required
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          aria-busy={loading}
          className="auth-submit btn-glow w-full flex items-center justify-center gap-2"
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
          <Link to="/register" state={location.state} className="text-primary hover:underline font-medium">
            สมัครสมาชิก
          </Link>
        </p>
      </form>
    </AuthPageLayout>
  );
}
