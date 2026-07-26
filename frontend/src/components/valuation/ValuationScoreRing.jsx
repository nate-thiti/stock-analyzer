import { GRADE_LABELS } from '../../api';

const GRADE_SCORE = {
  undervalued: 88,
  fair: 72,
  neutral: 52,
  overvalued: 28,
};

export default function ValuationScoreRing({ grade, pe, peg }) {
  const meta = GRADE_LABELS[grade] || GRADE_LABELS.neutral;
  const score = GRADE_SCORE[grade] ?? 50;
  const radius = 54;
  const stroke = 10;
  const normalized = radius - stroke / 2;
  const circumference = 2 * Math.PI * normalized;
  const offset = circumference - (score / 100) * circumference;

  const ringColor = grade === 'undervalued' ? '#10b981'
    : grade === 'fair' ? '#3b82f6'
    : grade === 'overvalued' ? '#ef4444'
    : '#f59e0b';

  return (
    <div className="flex flex-col items-center w-[180px]">
      <div className="relative w-[180px] h-[180px]">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <circle cx="60" cy="60" r={normalized} fill="none" stroke="var(--border)" strokeWidth={stroke} />
          <circle
            cx="60" cy="60" r={normalized} fill="none"
            stroke={ringColor}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-700"
            style={{ filter: `drop-shadow(0 0 8px ${ringColor}55)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-black ${meta.color}`}>{score}</span>
          <span className="text-[10px] text-muted uppercase tracking-wider">Score</span>
        </div>
      </div>
      <p className={`mt-2 text-sm font-bold ${meta.color}`}>{meta.label}</p>
      <p className="text-[10px] text-muted mt-0.5 text-center">
        P/E {pe?.toFixed(1) ?? '-'} • PEG {peg?.toFixed(2) ?? '-'}
      </p>
    </div>
  );
}
