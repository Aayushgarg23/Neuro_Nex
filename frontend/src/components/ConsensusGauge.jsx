import React, { useEffect, useState } from 'react';

export default function ConsensusGauge({ score = 0, size = 200 }) {
  const [animatedScore, setAnimatedScore] = useState(0);
  
  useEffect(() => {
    let current = 0;
    const target = score;
    const duration = 1500;
    const steps = 60;
    const increment = target / steps;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      current = Math.min(target, current + increment);
      setAnimatedScore(current);
      if (step >= steps) clearInterval(timer);
    }, duration / steps);
    return () => clearInterval(timer);
  }, [score]);

  const pct = Math.min(1, animatedScore);
  const r = size * 0.38;
  const cx = size / 2;
  const cy = size / 2;
  const strokeWidth = 10;
  
  // Arc from 215° to 325° (270° sweep for 3/4 circle)
  const startAngle = 215;
  const sweepAngle = 270;
  const currentAngle = startAngle + sweepAngle * pct;
  
  const polarToCart = (angle, radius) => ({
    x: cx + radius * Math.cos((angle * Math.PI) / 180),
    y: cy + radius * Math.sin((angle * Math.PI) / 180),
  });
  
  const arcPath = (fromAngle, toAngle, radius) => {
    const from = polarToCart(fromAngle, radius);
    const to = polarToCart(toAngle, radius);
    const largeArc = (toAngle - fromAngle) % 360 > 180 ? 1 : 0;
    return `M ${from.x} ${from.y} A ${radius} ${radius} 0 ${largeArc} 1 ${to.x} ${to.y}`;
  };

  const getColor = (p) => {
    if (p >= 0.8) return '#00D4AA';
    if (p >= 0.6) return '#F59E0B';
    return '#EF4444';
  };

  const color = getColor(pct);
  const needle = polarToCart(currentAngle, r * 0.7);

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size * 0.75} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        <defs>
          <filter id="gaugeglow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {/* Background arc */}
        <path d={arcPath(startAngle, startAngle + sweepAngle, r)}
              fill="none" stroke="#1E293B" strokeWidth={strokeWidth} strokeLinecap="round" />
        {/* Progress arc */}
        {pct > 0 && (
          <path d={arcPath(startAngle, currentAngle, r)}
                fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
                filter="url(#gaugeglow)" />
        )}
        {/* Needle dot */}
        <circle cx={needle.x} cy={needle.y} r={5} fill={color} filter="url(#gaugeglow)" />
        {/* Center score */}
        <text x={cx} y={cy - 5} textAnchor="middle" fill={color}
              fontSize={size * 0.18} fontWeight="700" fontFamily="JetBrains Mono">
          {(pct * 100).toFixed(1)}%
        </text>
        <text x={cx} y={cy + size * 0.12} textAnchor="middle" fill="#475569"
              fontSize={size * 0.065} fontFamily="Inter">
          CONSENSUS SCORE
        </text>
        {/* Grade labels */}
        <text x={polarToCart(startAngle, r + 18).x} y={polarToCart(startAngle, r + 18).y}
              textAnchor="middle" fill="#EF4444" fontSize={size * 0.055} fontFamily="Inter">LOW</text>
        <text x={polarToCart(startAngle + sweepAngle, r + 18).x} y={polarToCart(startAngle + sweepAngle, r + 18).y}
              textAnchor="middle" fill="#00D4AA" fontSize={size * 0.055} fontFamily="Inter">HIGH</text>
      </svg>
    </div>
  );
}
