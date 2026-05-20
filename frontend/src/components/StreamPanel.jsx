import React from 'react';
import { Shield, Brain, Heart, Eye } from 'lucide-react';

export default function StreamPanel({ reviews }) {
  const getIcon = (agent) => {
    switch (agent) {
      case 'evidence_agent': return <Brain className="text-emerald-400 w-4 h-4" />;
      case 'skeptic_agent': return <Shield className="text-rose-400 w-4 h-4" />;
      case 'connector_agent': return <Heart className="text-blue-400 w-4 h-4" />;
      default: return <Eye className="text-purple-400 w-4 h-4" />;
    }
  };

  return (
    <div className="w-full bg-slate-950 border border-slate-800 rounded-xl p-6">
      <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
        <span>Active Agent Deliberations </span>
      </h3>
      <div className="space-y-4">
        {Object.entries(reviews).map(([agent, data]) => (
          <div key={agent} className="border-l-2 border-slate-800 pl-4 py-1">
            <div className="flex items-center gap-2 mb-1.5">
              {getIcon(agent)}
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                {agent.replace('_', ' ')}
              </span>
              <span className="text-xs text-slate-500 font-mono ml-auto">
                Confidence: {(data.confidence * 100).toFixed(0)}%
              </span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed mb-2">{data.findings}</p>
            <div className="flex flex-wrap gap-1.5">
              {data.citations.map((cite, idx) => (
                <span key={idx} className="text-[10px] bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-slate-500 font-mono">
                  {cite}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
