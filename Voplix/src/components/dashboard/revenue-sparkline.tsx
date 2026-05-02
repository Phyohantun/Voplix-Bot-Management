'use client';

export function RevenueSparkline({ values, className }: { values: number[]; className?: string }) {
  const w = 120;
  const h = 36;
  const pad = 2;
  const max = Math.max(1, ...values);
  const min = 0;
  const range = max - min || 1;
  const step = values.length > 1 ? (w - pad * 2) / (values.length - 1) : 0;
  const pts = values.map((v, i) => {
    const x = pad + i * step;
    const y = pad + (1 - (v - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  });
  const d = `M ${pts.join(' L ')}`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={className} aria-hidden>
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
