import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { UserPlus, AlertTriangle, CheckCircle2, LockKeyhole, Mail, UserRound } from 'lucide-react';
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
      tagline="สร้าง Portfolio DNA ในแบบของคุณ"
      description="เริ่มจากหุ้นที่คุณสนใจ แล้วให้ระบบประกอบข้อมูลเป็นโครงสร้างพอร์ต ความเสี่ยง และโอกาสที่มองเห็นได้"
      helperText="ใช้เวลาไม่ถึงหนึ่งนาที แล้วตั้งค่าความเสี่ยงให้เหมาะกับคุณ"
      sceneVariant="dna"
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
            <label htmlFor="register-name" className="text-xs font-bold text-muted">ชื่อผู้ใช้</label>
            <div className="relative mt-1.5">
              <UserRound size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                id="register-name"
                type="text"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(null); }}
                required
                minLength={2}
                maxLength={64}
                autoComplete="username"
                className="auth-input w-full pl-11"
                placeholder="John Doe"
              />
            </div>
          </div>
          <div>
            <label htmlFor="register-email" className="text-xs font-bold text-muted">อีเมล</label>
            <div className="relative mt-1.5">
              <Mail size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                id="register-email"
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
            <label htmlFor="register-password" className="text-xs font-bold text-muted">รหัสผ่าน</label>
            <PasswordInput
              id="register-password"
              leadingIcon={LockKeyhole}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null); }}
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="อย่างน้อย 6 ตัวอักษร"
            />
            <p className={`mt-1.5 flex items-center gap-1 text-xs ${password.length >= 6 ? 'text-success' : 'text-muted'}`}>
              <CheckCircle2 size={12} /> อย่างน้อย 6 ตัวอักษร
            </p>
          </div>
          <div>
            <label htmlFor="register-confirm-password" className="text-xs font-bold text-muted">ยืนยันรหัสผ่าน</label>
            <PasswordInput
              id="register-confirm-password"
              leadingIcon={LockKeyhole}
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="••••••••"
            />
            {confirmPassword && (
              <p className={`mt-1.5 flex items-center gap-1 text-xs ${password === confirmPassword ? 'text-success' : 'text-danger'}`} aria-live="polite">
                <CheckCircle2 size={12} /> {password === confirmPassword ? 'รหัสผ่านตรงกัน' : 'รหัสผ่านยังไม่ตรงกัน'}
              </p>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || password.length < 6 || password !== confirmPassword}
          aria-busy={loading}
          className="auth-submit btn-glow w-full flex items-center justify-center gap-2"
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
