import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle, AlertTriangle, XCircle, Settings2,
  ChevronDown, ChevronUp, Copy, Check, Zap, Brain,
  Shield, Activity, GitBranch, MessageSquare
} from 'lucide-react';
import ConsensusGauge from '../components/ConsensusGauge.jsx';
import IBCTChain from '../components/IBCTChain.jsx';
import VisualGraph from '../components/VisualGraph.jsx';

const AGENT_META = {
  evidence_agent:  { name: 'Evidence Agent',    emoji: '🔬', accent: '#10b981', bg: 'emerald' },
  skeptic_agent:   { name: 'Skeptic Agent',     emoji: '⚔️',  accent: '#ef4444', bg: 'red'     },
  connector_agent: { name: 'Connector Agent',   emoji: '🔗', accent: '#6366f1', bg: 'indigo'  },
  quality_agent:   { name: 'Methodology Agent', emoji: '📋', accent: '#8b5cf6', bg: 'violet'  },
};

const PRIORITY_BARS = {
  high:   'bg-emerald-500',
  medium: 'bg-amber-500',
  low:    'bg-red-500',
};

export default function ResultsPage({ isDarkMode }) {
  const { state }  = useLocation();
  const navigate   = useNavigate();
  const [showAdv, setShowAdv]   = useState(false);
  const [copied, setCopied]     = useState(null);

  if (!state?.result) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Brain className="w-12 h-12 text-slate-300 mx-auto" />
          <p className="text-slate-400 text-sm">No results to display.</p>
          <button onClick={() => navigate('/')} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors">
            Run a Query
          </button>
        </div>
      </div>
    );
  }

  const { result, query } = state;
  const score        = result.score ?? 0;
  const verdict      = result.data?.consensus_verdict ?? 'No verdict generated.';
  const trl          = result.data?.trl_assessment ?? '';
  const calibration  = result.data?.calibration ?? {};
  const reviews      = result.peer_evaluations_compiled ?? {};
  const ibctChain    = result.ibct_chain ?? [];
  const qaoa         = result.qaoa_schedule ?? [];
  const tokenMetrics = result.token_metrics ?? null;
  const latency      = result.latency_ms ?? 0;
  const threadId     = result.thread_id ?? '';

  const scoreColor = score >= 0.8 ? 'emerald' : score >= 0.6 ? 'amber' : 'red';
  const ScoreIcon  = score >= 0.8 ? CheckCircle : score >= 0.6 ? AlertTriangle : XCircle;

  const copy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="flex-1 max-w-5xl mx-auto w-full px-4 md:px-6 py-8 space-y-6">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div>
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Chat
        </button>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white leading-tight max-w-2xl">
            "{query}"
          </h1>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors shadow-md shadow-indigo-500/20"
          >
            <MessageSquare className="w-4 h-4" /> Continue Chat
          </button>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap gap-2 mt-3">
          {[
            { label: `Thread: ${threadId.slice(0, 14)}…`, icon: null },
            { label: `${(latency / 1000).toFixed(1)}s total`, icon: <Activity className="w-3 h-3" /> },
            { label: result.token_metrics?.tokens_used ? `${result.token_metrics.tokens_used.toLocaleString()} tokens` : null },
            { label: `gemini-3.5-flash`, icon: <Zap className="w-3 h-3 text-amber-500" /> },
          ].filter(m => m.label).map((m, i) => (
            <span key={i} className="inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg border border-slate-200 dark:border-slate-700">
              {m.icon} {m.label}
            </span>
          ))}
        </div>
      </div>

      {/* ── Verdict + Score ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Verdict */}
        <div className={`md:col-span-2 rounded-2xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm border-l-4 border-l-${scoreColor}-500`}>
          <div className="flex items-center gap-2 mb-3">
            <ScoreIcon className={`w-5 h-5 text-${scoreColor}-500`} />
            <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">Council Consensus Verdict</span>
          </div>
          <p className="text-base md:text-lg font-semibold text-slate-800 dark:text-slate-100 leading-relaxed">{verdict}</p>
          {trl && (
            <div className="mt-4">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-mono border border-indigo-200 dark:border-indigo-800">
                <Shield className="w-3.5 h-3.5" /> {trl}
              </span>
            </div>
          )}
          {Object.keys(calibration).length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-3 text-center">
              {[
                { label: 'Evidence Weight (α)', val: calibration.alpha ?? '—' },
                { label: 'Connector Weight (β)', val: calibration.beta ?? '—' },
                { label: 'Skeptic Penalty (γ)', val: calibration.gamma ?? '—' },
              ].map((c, i) => (
                <div key={i} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-2">
                  <p className="text-xs font-mono text-slate-400 mb-1">{c.label}</p>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{c.val}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Score Gauge */}
        <div className="rounded-2xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center gap-2">
          <ConsensusGauge score={score} size={140} />
          <p className="text-xs font-mono text-slate-400 text-center">Calibrated Confidence</p>
          <p className="text-[11px] text-slate-400 text-center leading-relaxed max-w-[160px]">
            Weighted by Evidence, Connector, and penalized by Skeptic's critique
          </p>
        </div>
      </div>

      {/* ── Agent Analysis ───────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-5 h-5 text-indigo-500" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Agent Analysis</h2>
          <span className="text-xs font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{Object.keys(reviews).length} agents</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(reviews).map(([id, rev]) => (
            <AgentCard key={id} agentId={id} review={rev} />
          ))}
          {Object.keys(reviews).length === 0 && (
            <p className="col-span-2 text-center text-slate-400 text-sm py-10 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              No agent analysis available.
            </p>
          )}
        </div>
      </section>

      {/* ── QAOA Schedule ────────────────────────────────────────────── */}
      {qaoa.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">QAOA Execution Schedule</h2>
            <span className="text-xs font-mono text-slate-400 ml-auto">Quantum-Inspired Optimization</span>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                Priority and energy values are dynamically computed per query using actual agent token usage, latency, and peer-review conflicts.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                    <th className="px-5 py-3 text-left">Agent</th>
                    <th className="px-5 py-3 text-left">Slot</th>
                    <th className="px-5 py-3 text-left">Priority Score</th>
                    <th className="px-5 py-3 text-left">QAOA Energy</th>
                    <th className="px-5 py-3 text-left">Conflict Score</th>
                  </tr>
                </thead>
                <tbody>
                  {qaoa.map((item, i) => {
                    const pctPriority = Math.min((item.priority ?? 0) * 100, 100);
                    const priClass = pctPriority >= 70 ? PRIORITY_BARS.high : pctPriority >= 40 ? PRIORITY_BARS.medium : PRIORITY_BARS.low;
                    const meta = AGENT_META[item.agent_id] ?? {};
                    return (
                      <tr key={i} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <span>{meta.emoji ?? '🤖'}</span>
                            <span className="font-mono text-xs text-slate-600 dark:text-slate-300">{item.agent_id}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-mono font-bold ${item.slot === 0 ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300' : 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300'}`}>
                            Slot {item.slot}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2 min-w-[100px]">
                            <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div className={`h-full ${priClass} rounded-full`} style={{ width: `${pctPriority}%`, transition: 'width 1s ease' }} />
                            </div>
                            <span className="text-xs font-mono text-slate-600 dark:text-slate-300 w-12 text-right">{(item.priority ?? 0).toFixed(4)}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`font-mono text-xs font-bold ${(item.qaoa_energy ?? 0) > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                            {(item.qaoa_energy ?? 0).toFixed(4)}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span className="font-mono text-xs text-violet-600 dark:text-violet-400">
                            {(item.conflict_score ?? 0).toFixed(4)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ── Token Usage ──────────────────────────────────────────────── */}
      {tokenMetrics && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Token Usage</h2>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {[
                { label: 'Tokens Used',      val: (tokenMetrics.tokens_used ?? 0).toLocaleString(), color: 'text-blue-600 dark:text-blue-400' },
                { label: 'Tokens Remaining', val: (tokenMetrics.tokens_remaining ?? 0).toLocaleString(), color: 'text-emerald-600 dark:text-emerald-400' },
                { label: 'LLM Calls',        val: tokenMetrics.calls_made ?? 0, color: 'text-violet-600 dark:text-violet-400' },
                { label: 'Est. Cost',        val: `$${(tokenMetrics.total_cost_usd ?? 0).toFixed(5)}`, color: 'text-amber-600 dark:text-amber-400' },
              ].map((m, i) => (
                <div key={i} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
                  <p className="text-[11px] font-mono text-slate-400 mb-1">{m.label}</p>
                  <p className={`text-base font-bold ${m.color}`}>{m.val}</p>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs font-mono text-slate-400 mb-1.5">
              <span>{(tokenMetrics.utilization_pct ?? 0).toFixed(1)}% utilized</span>
              <span>Tier: {tokenMetrics.current_tier ?? 'standard'} · {tokenMetrics.tier_model ?? 'gemini-3.5-flash'}</span>
            </div>
            <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all"
                style={{ width: `${Math.min(tokenMetrics.utilization_pct ?? 0, 100)}%` }}
              />
            </div>
          </div>
        </section>
      )}

      {/* ── Advanced Diagnostics ─────────────────────────────────────── */}
      <button
        onClick={() => setShowAdv(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors text-sm font-medium text-slate-600 dark:text-slate-400"
      >
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4" />
          Advanced Diagnostics (Knowledge Graph + IBCT Provenance Chain)
        </div>
        {showAdv ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {showAdv && (
        <div className="space-y-6">
          {/* Knowledge Graph */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <GitBranch className="w-5 h-5 text-violet-500" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Knowledge Graph</h2>
            </div>
            <GraphWrapper isDarkMode={isDarkMode} />
          </section>

          {/* IBCT Chain */}
          {ibctChain.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-emerald-500" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">IBCT Provenance Chain</h2>
              </div>
              <IBCTChain chain={ibctChain} />
            </section>
          )}

          {/* Raw JSON */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Raw API Response</h2>
              <button
                onClick={() => copy(JSON.stringify(result, null, 2), 'raw')}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-600 transition-colors px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700"
              >
                {copied === 'raw' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copied === 'raw' ? 'Copied!' : 'Copy JSON'}
              </button>
            </div>
            <pre className="bg-slate-950 text-slate-300 text-xs font-mono p-5 rounded-2xl overflow-auto max-h-64 border border-slate-800 leading-relaxed">
              {JSON.stringify(result, null, 2)}
            </pre>
          </section>
        </div>
      )}
    </div>
  );
}

/* ─── Agent Analysis Card ─────────────────────────────────────────── */
function AgentCard({ agentId, review }) {
  const [expanded, setExpanded] = useState(false);
  const meta       = AGENT_META[agentId] ?? { name: agentId, emoji: '🤖', accent: '#94a3b8' };
  const findings   = review?.findings ?? review;
  const confidence = review?.confidence ?? null;
  const tokens     = review?.tokens ?? null;
  const latency    = review?.latency_ms ?? null;
  const model      = review?.model_used ?? null;

  return (
    <div
      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-5 transition-all hover:shadow-md"
      style={{ borderLeftWidth: 4, borderLeftColor: meta.accent }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{meta.emoji}</span>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">{meta.name}</h3>
            {model && <p className="text-[10px] font-mono text-slate-400">{model}</p>}
          </div>
        </div>
        {confidence !== null && (
          <div className="text-right">
            <p className="text-base font-black" style={{ color: meta.accent }}>{(confidence * 100).toFixed(1)}%</p>
            <p className="text-[10px] font-mono text-slate-400">confidence</p>
          </div>
        )}
      </div>

      <p className={`text-sm text-slate-600 dark:text-slate-300 leading-relaxed ${!expanded ? 'line-clamp-4' : ''}`}>
        {typeof findings === 'string' ? findings : JSON.stringify(findings)}
      </p>

      {findings?.length > 250 && (
        <button onClick={() => setExpanded(v => !v)} className="mt-2 text-xs font-medium text-slate-400 hover:text-indigo-500 transition-colors flex items-center gap-1">
          {expanded ? <><ChevronUp className="w-3 h-3" /> Show less</> : <><ChevronDown className="w-3 h-3" /> Read more</>}
        </button>
      )}

      {(tokens || latency) && (
        <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] font-mono text-slate-400">
          {tokens && <span>~{tokens.toLocaleString()} tokens</span>}
          {latency && <span>{latency.toFixed(0)}ms</span>}
          {review?.citations?.length > 0 && (
            <span className="text-indigo-400">{review.citations.slice(0, 2).join(' · ')}</span>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Graph Wrapper with live Neo4j fetch ─────────────────────────── */
function GraphWrapper({ isDarkMode }) {
  const [graphData, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState(false);

  React.useEffect(() => {
    fetch('/api/v1/graph')
      .then(r => r.json())
      .then(d => { setData(d.data || d); setLoading(false); })
      .catch(() => { setErr(true); setLoading(false); });
  }, []);

  if (loading) return (
    <div className="h-80 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-slate-400">Fetching Neo4j knowledge graph…</p>
      </div>
    </div>
  );

  if (err || !graphData?.nodes?.length) return (
    <div className="h-80 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="text-center space-y-2">
        <GitBranch className="w-10 h-10 text-slate-300 mx-auto" />
        <p className="text-sm text-slate-400">No graph data yet — run a query to populate the Neo4j knowledge graph.</p>
      </div>
    </div>
  );

  return <VisualGraph graphData={graphData} isDarkMode={isDarkMode} />;
}
