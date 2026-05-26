// Custom NeuroNex logo mark — 5-node constellation (4 agents + Chairman)
// Fully scalable SVG, no external deps
export default function Logo({ size = 32, withText = false, textClass = '' }) {
  const cx = size / 2;
  const cy = size / 2;
  const r  = size * 0.38;   // orbit radius
  const nr = size * 0.072;  // node radius
  const cr = size * 0.10;   // center radius

  // 4 agent nodes at cardinal-ish positions (slightly rotated for aesthetic)
  const angles = [315, 45, 135, 225]; // NE, SE, SW, NW
  const colors = ['#10b981', '#ef4444', '#6366f1', '#8b5cf6'];
  const nodes  = angles.map((a, i) => ({
    x: cx + r * Math.cos((a * Math.PI) / 180),
    y: cy + r * Math.sin((a * Math.PI) / 180),
    color: colors[i],
  }));

  return (
    <div className={`flex items-center gap-2.5 ${withText ? '' : 'inline-flex'}`}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="NeuroNex logo"
      >
        <defs>
          {/* Center gradient */}
          <radialGradient id="cg" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#7c3aed" stopOpacity="1" />
            <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.9" />
          </radialGradient>
          {/* Glow filter */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation={size * 0.04} result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Connection lines from center to each node */}
        {nodes.map((n, i) => (
          <line
            key={`line-${i}`}
            x1={cx} y1={cy}
            x2={n.x} y2={n.y}
            stroke={n.color}
            strokeWidth={size * 0.018}
            strokeOpacity="0.5"
            strokeDasharray={`${size * 0.08} ${size * 0.04}`}
          />
        ))}

        {/* Cross lines between adjacent nodes */}
        {nodes.map((n, i) => {
          const next = nodes[(i + 1) % nodes.length];
          return (
            <line
              key={`cross-${i}`}
              x1={n.x} y1={n.y}
              x2={next.x} y2={next.y}
              stroke="rgba(148,163,184,0.15)"
              strokeWidth={size * 0.012}
            />
          );
        })}

        {/* Agent nodes */}
        {nodes.map((n, i) => (
          <g key={`node-${i}`} filter="url(#glow)">
            <circle cx={n.x} cy={n.y} r={nr * 1.8} fill={n.color} fillOpacity="0.12" />
            <circle cx={n.x} cy={n.y} r={nr} fill={n.color} />
          </g>
        ))}

        {/* Center / Chairman node */}
        <circle cx={cx} cy={cy} r={cr * 1.6} fill="#7c3aed" fillOpacity="0.15" />
        <circle cx={cx} cy={cy} r={cr} fill="url(#cg)" filter="url(#glow)" />

        {/* Center "N" mark */}
        <text
          x={cx} y={cy}
          textAnchor="middle"
          dominantBaseline="central"
          fill="white"
          fontSize={cr * 1.15}
          fontWeight="900"
          fontFamily="Inter, sans-serif"
          letterSpacing="-0.5"
        >
          N
        </text>
      </svg>

      {withText && (
        <span className={`font-black tracking-tight ${textClass}`}>
          NeuroNex
        </span>
      )}
    </div>
  );
}
