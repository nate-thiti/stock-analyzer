import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { UserPlus, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import PasswordInput from '../components/PasswordInput';
import AuthPageLayout from '../components/auth/AuthPageLayout';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { register, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/';

  useEffect(() => {
    if (user) navigate(from, { replace: true });
  }, [user, from, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('รหัสผ่านไม่ตรงกัน');
      return;
    }

    setLoading(true);
    try {
      await register(username.trim(), email.trim(), password);
      navigate(from, { replace: true, state: { setupRisk: true } });
    } catch (err) {
      setError(err.message || 'สมัครสมาชิกไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageLayout
      title="สมัครสมาชิก"
      subtitle="สร้างบัญชีใหม่"
      icon={UserPlus}
      tagline="เริ่มติดตามหุ้นที่คุณสนใจ"
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
            <label className="text-[10px] font-bold text-muted uppercase">ชื่อผู้ใช้</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={2}
              maxLength={64}
              autoComplete="username"
              className="w-full mt-1 bg-surface border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
              placeholder="John Doe"
            />
          </div>
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
              minLength={6}
              autoComplete="new-password"
              placeholder="อย่างน้อย 6 ตัวอักษร"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-muted uppercase">ยืนยันรหัสผ่าน</label>
            <PasswordInput
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="••••••••"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-gradient-primary border border-primary rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? 'กำลังสมัคร...' : (
            <>
              <UserPlus size={16} />
              สมัครสมาชิก
            </>
          )}
        </button>

        <p className="text-center text-xs text-muted">
          มีบัญชีแล้ว?{' '}
          <Link to="/login" state={location.state} className="text-primary hover:underline font-medium">
            เข้าสู่ระบบ
          </Link>
        </p>
      </form>
    </AuthPageLayout>
  );
}
