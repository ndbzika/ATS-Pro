export function ScoreRing({ score, size = 72 }: { score: number; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  const color = score >= 70 ? "text-primary" : score >= 45 ? "text-amber-600" : "text-destructive";
  const stroke = score >= 70 ? "stroke-primary" : score >= 45 ? "stroke-amber-500" : "stroke-destructive";
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={6} className="stroke-border" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)}
          className={`${stroke} transition-all duration-500`}
        />
      </svg>
      <span className={`absolute font-display text-lg font-semibold ${color}`}>{Math.round(score)}</span>
    </div>
  );
}
