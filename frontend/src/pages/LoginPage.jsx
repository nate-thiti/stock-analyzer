import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { LogIn, AlertTriangle } from 'lucide-react';
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
      tagline="วิเคราะห์หุ้นอย่างเรียบง่าย"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
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
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
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
          <Link to="/register" state={location.state} className="text-primary hover:underline font-medium">
            สมัครสมาชิก
          </Link>
        </p>
      </form>
    </AuthPageLayout>
  );
}
