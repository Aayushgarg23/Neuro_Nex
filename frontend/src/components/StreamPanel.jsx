import React, { useEffect, useState } from 'react';
import { Brain, Shield, Link, Eye, CheckCircle } from 'lucide-react';

const AGENT_CONFIG = {
  evidence_agent: { icon: Brain, color: '#10B981', label: 'Evidence Agent', role: 'Factual Analysis' },
  skeptic_agent: { icon: Shield, color: '#EF4444', label: 'Skeptic Agent', role: 'Bias Detection' },
  connector_agent: { icon: Link, color: '#3B82F6', label: 'Connector Agent', role: 'Graph Traversal' },
  quality_agent: { icon: Eye, color: '#8B5CF6', label: 'Methodology Agent', role: 'Quality Audit' },
};

function ConfidenceBar({ confidence, color }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(confidence * 100), 100);
    return () => clearTimeout(t);
  }, [confidence]);
  return (
    <div className="h-1 bg-slate-800 rounded-full overflow-hidden mt-2">
      <div className="h-full rounded-full transition-all duration-1000 ease-out"
           style={{ width: `${width}%`, background: color, boxShadow: `0 0 8px ${color}66` }} />
    </div>
  );
}

export default function StreamPanel({ reviews }) {
  const entries = Object.entries(reviews);
  if (!entries.length) return null;

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#00D4AA' }} />
        <h3 className="text-sm font-bold font-display text-slate-100">Agent Council Deliberations</h3>
        <span className="badge badge-brand ml-auto">{entries.length} agents</span>
      </div>
      <div className="space-y-4">
        {entries.map(([agentId, data], idx) => {
          const config = AGENT_CONFIG[agentId] || { icon: Eye, color: '#94A3B8', label: agentId, role: 'Agent' };
          const Icon = config.icon;
          return (
            <div key={agentId}
                 className="rounded-xl p-4 border transition-all duration-300 group"
                 style={{
                   background: 'rgba(15,23,42,0.6)',
                   borderColor: `${config.color}22`,
                   animationDelay: `${idx * 150}ms`,
                 }}>
              {/* Agent Header */}
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                     style={{ background: `${config.color}15`, border: `1px solid ${config.color}33` }}>
                  <Icon className="w-3.5 h-3.5" style={{ color: config.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold font-display text-slate-200">{config.label}</span>
                    <span className="text-[10px] text-slate-600">{config.role}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-3 h-3 text-emerald-500" />
                  <span className="text-xs font-mono font-bold" style={{ color: config.color }}>
                    {(data.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
              {/* Findings */}
              <p className="text-xs text-slate-400 leading-relaxed mb-2 pl-9">
                {data.findings}
              </p>
              {/* Confidence Bar */}
              <div className="pl-9">
                <ConfidenceBar confidence={data.confidence} color={config.color} />
                {/* Citations */}
                {data.citations?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {data.citations.map((cite, i) => (
                      <span key={i} className="badge badge-brand text-[10px]">{cite}</span>
                    ))}
                    {data.model_used && (
                      <span className="badge badge-violet text-[10px] ml-auto">
                        {data.model_used}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
