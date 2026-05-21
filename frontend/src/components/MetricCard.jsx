import React, { useEffect, useState } from 'react';

export default function MetricCard({ label, value, unit = '', icon, color = '#00D4AA', animate = true }) {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    if (!animate || typeof value !== 'number') {
      setDisplayValue(value);
      return;
    }
    let start = 0;
    const end = value;
    const duration = 1200;
    const step = 16;
    const increment = end / (duration / step);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setDisplayValue(end);
        clearInterval(timer);
      } else {
        setDisplayValue(start);
      }
    }, step);
    return () => clearInterval(timer);
  }, [value, animate]);

  const formattedValue = typeof value === 'number'
    ? Number.isInteger(value) ? Math.round(displayValue) : displayValue.toFixed(2)
    : value;

  return (
    <div className="glass-card p-4 relative overflow-hidden group transition-all duration-300 hover:brand-glow cursor-default">
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-5 group-hover:opacity-10 transition-opacity"
           style={{ background: color, transform: 'translate(30%, -30%)' }} />
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        <span className="badge badge-brand text-xs">{unit}</span>
      </div>
      <div className="font-mono text-2xl font-bold count-up" style={{ color }}>
        {formattedValue}
      </div>
      <div className="text-xs text-slate-500 mt-1 font-display">{label}</div>
    </div>
  );
}
