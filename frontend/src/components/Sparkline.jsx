// Fourteen days of completions drawn as ink ticks on a ruled baseline.
export default function Sparkline({ data }) {
  const max = Math.max(1, ...data.map((d) => d.done));
  const step = 28;
  const w = 14 * step;
  const h = 96;
  return (
    <figure className="spark">
      <svg viewBox={`0 0 ${w} ${h + 20}`} role="img" aria-label="Tasks completed per day, last 14 days">
        <line x1="0" x2={w} y1={h} y2={h} className="spark-base" />
        {data.map((d, i) => {
          const barH = d.done ? Math.max(6, (d.done / max) * (h - 10)) : 0;
          const isToday = i === data.length - 1;
          return (
            <g key={d.date}>
              <title>{`${d.date}: ${d.done} done`}</title>
              {d.done > 0 ? (
                <rect x={i * step + 8} y={h - barH} width="12" height={barH} className={isToday ? "spark-today" : "spark-bar"} />
              ) : (
                <circle cx={i * step + 14} cy={h - 5} r="2" className="spark-dot" />
              )}
            </g>
          );
        })}
        <text x="0" y={h + 16} className="spark-label">2 wks ago</text>
        <text x={w} y={h + 16} textAnchor="end" className="spark-label">today</text>
      </svg>
    </figure>
  );
}
