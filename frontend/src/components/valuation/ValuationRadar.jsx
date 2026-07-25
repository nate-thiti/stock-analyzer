const AXES = [
  { key: 'pe', label: 'P/E', invert: true, max: 50 },
  { key: 'peg', label: 'PEG', invert: true, max: 3 },
  { key: 'ps', label: 'P/S', invert: true, max: 15 },
  { key: 'pb', label: 'P/B', invert: true, max: 10 },
  { key: 'roe', label: 'ROE', invert: false, max: 0.35 },
];

function normalize(key, value, invert, max) {
  if (value == null) return 0.35;
  let v = value;
  if (key === 'roe' && Math.abs(v) > 1) v = v / 100;
  const ratio = Math.min(Math.max(v / max, 0), 1);
  const score = invert ? 1 - ratio : ratio;
  return 0.25 + score * 0.75;
}

function point(angle, radius, cx, cy) {
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  };
}

export default function ValuationRadar({ fundamental, large = false }) {
  if (!fundamental) return null;

  const values = {
    pe: fundamental.pe_ratio,
    peg: fundamental.peg_ratio,
    ps: fundamental.ps_ratio,
    pb: fundamental.pb_ratio,
    roe: fundamental.roe,
  };

  const cx = 120;
  const cy = 120;
  const maxR = large ? 92 : 78;
  const n = AXES.length;

  const angles = AXES.map((_, i) => (Math.PI * 2 * i) / n - Math.PI / 2);
  const gridLevels = [0.35, 0.6, 0.85, 1];

  const dataPoints = AXES.map((axis, i) => {
    const r = maxR * normalize(axis.key, values[axis.key], axis.invert, axis.max);
    return point(angles[i], r, cx, cy);
  });

  const polygon = dataPoints.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div className="w-full">
      <svg
        viewBox="0 0 240 240"
        className={`w-full mx-auto ${large ? 'max-w-[420px] min-h-[280px]' : 'max-w-[280px]'}`}
      >
        {gridLevels.map((level) => (
          <polygon
            key={level}
            points={angles.map((a) => {
              const p = point(a, maxR * level, cx, cy);
              return `${p.x},${p.y}`;
            }).join(' ')}
            fill="none"
            stroke="var(--border)"
            strokeWidth="1"
            opacity={0.7}
          />
        ))}

        {angles.map((a, i) => {
          const p = point(a, maxR, cx, cy);
          return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="var(--border)" strokeWidth="1" opacity={0.6} />;
        })}

        <polygon
          points={polygon}
          fill="rgba(59,130,246,0.25)"
          stroke="var(--primary)"
          strokeWidth="2"
          style={{ filter: 'drop-shadow(0 0 12px var(--primary-glow))' }}
        />

        {dataPoints.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="4" fill="var(--primary)" />
        ))}

        {AXES.map((axis, i) => {
          const labelPt = point(angles[i], maxR + 18, cx, cy);
          return (
            <text
              key={axis.key}
              x={labelPt.x}
              y={labelPt.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="var(--muted)"
              fontSize="12"
              fontWeight="600"
            >
              {axis.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
