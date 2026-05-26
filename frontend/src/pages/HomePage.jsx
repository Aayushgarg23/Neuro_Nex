import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo.jsx';
import {
  Send, Paperclip, X, FileText, Brain, Plus, Trash2,
  MessageSquare, Sun, Moon, ChevronDown, ChevronRight,
  CheckCircle, AlertTriangle, XCircle, Menu,
  Upload, Loader2, ArrowLeft, BookOpen, Zap, Home,
} from 'lucide-react';

/* ─────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────── */
const AGENTS = {
  evidence_agent:  { name: 'Evidence Agent',    short: 'Evidence',  emoji: '🔬', color: '#10b981', bg: 'emerald', think: ['Scanning data sources…', 'Cross-referencing records…', 'Extracting key metrics…', 'Building evidence map…'] },
  skeptic_agent:   { name: 'Skeptic Agent',     short: 'Skeptic',   emoji: '⚔️',  color: '#ef4444', bg: 'red',     think: ['Auditing methodology…', 'Identifying biases…', 'Stress-testing claims…', 'Checking counter-evidence…'] },
  connector_agent: { name: 'Connector Agent',   short: 'Connector', emoji: '🔗', color: '#6366f1', bg: 'indigo',  think: ['Multi-hop traversal…', 'Finding hidden links…', 'Cross-domain mapping…', 'Building connection graph…'] },
  quality_agent:   { name: 'Methodology Agent', short: 'Methodology',emoji: '📋', color: '#8b5cf6', bg: 'violet',  think: ['Auditing frameworks…', 'Scoring data quality…', 'Reviewing methodology…', 'Assessing readiness…'] },
};

const LS_SESSIONS = 'nnx_sessions_v3';
const LS_ACTIVE   = 'nnx_active_v3';
const LS_THEME    = 'nnx_theme';

/* ─────────────────────────────────────────
   STORAGE HELPERS
───────────────────────────────────────── */
const loadSessions = () => { try { return JSON.parse(localStorage.getItem(LS_SESSIONS) || '[]'); } catch { return []; } };
const saveSessions = (s) => localStorage.setItem(LS_SESSIONS, JSON.stringify(s.slice(0, 40)));
const genId = () => `s_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

/* ─────────────────────────────────────────
   SCORE UTILITIES
───────────────────────────────────────── */
function scoreColor(s)  { return s >= 0.8 ? '#10b981' : s >= 0.6 ? '#f59e0b' : '#ef4444'; }
function scoreLabel(s)  { return s >= 0.8 ? 'High Confidence' : s >= 0.6 ? 'Moderate Confidence' : 'Low Confidence'; }
function ScoreIcon({ s, size = 16 }) {
  if (s >= 0.8) return <CheckCircle size={size} style={{ color: '#10b981' }} />;
  if (s >= 0.6) return <AlertTriangle size={size} style={{ color: '#f59e0b' }} />;
  return <XCircle size={size} style={{ color: '#ef4444' }} />;
}

/* ─────────────────────────────────────────
   CIRCULAR SCORE RING
───────────────────────────────────────── */
function ScoreRing({ score, size = 56 }) {
  const r = (size / 2) - 5;
  const circ = 2 * Math.PI * r;
  const dash = circ * Math.max(0, Math.min(1, score));
  const cx = size / 2, cy = size / 2;
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth="4" className="dark:stroke-gray-700" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={scoreColor(score)} strokeWidth="4"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s ease' }} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-black"
        style={{ color: scoreColor(score) }}>
        {Math.round(score * 100)}%
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────
   AGENT FULL-VIEW MODAL
───────────────────────────────────────── */
function AgentModal({ agentId, data, onClose }) {
  const meta = AGENTS[agentId] ?? { name: agentId, emoji: '🤖', color: '#6b7280' };
  const paragraphs = (data?.findings ?? '').split(/\n\n+/).filter(p => p.trim());

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col animate-scale-pop">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800"
          style={{ borderLeftWidth: 4, borderLeftColor: meta.color }}>
          <span className="text-2xl">{meta.emoji}</span>
          <div className="flex-1 min-w-0">
            <h2 className="font-black text-base text-gray-900 dark:text-white">{meta.name}</h2>
            <div className="flex items-center gap-3 mt-0.5">
              {data?.confidence && (
                <span className="text-xs font-bold font-mono" style={{ color: meta.color }}>
                  {(data.confidence * 100).toFixed(1)}% confidence
                </span>
              )}
              {data?.latency_ms && (
                <span className="text-xs text-gray-400 font-mono">{(data.latency_ms / 1000).toFixed(1)}s</span>
              )}
              {data?.tokens && (
                <span className="text-xs text-gray-400 font-mono">~{data.tokens.toLocaleString()} tokens</span>
              )}
              {data?.model_used && (
                <span className="text-xs text-gray-400 font-mono">{data.model_used}</span>
              )}
            </div>
          </div>
          <button onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {paragraphs.length > 0 ? (
            <div className="space-y-4">
              {paragraphs.map((p, i) => (
                <p key={i} className="text-sm text-gray-700 dark:text-gray-300 leading-7">{p.trim()}</p>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">No detailed analysis available.</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <span className="text-[11px] text-gray-400 font-mono">Full {meta.name} Report</span>
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-semibold hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   RESULT CARD (inline in chat)
───────────────────────────────────────── */
function ResultCard({ result }) {
  const [agOpen, setAgOpen]   = useState(false);  // closed by default
  const [techOpen, setTechOpen] = useState(false);
  const [modalAgent, setModalAgent] = useState(null); // agent_id to show in modal

  const score    = result.score ?? 0;
  const verdict  = result.data?.consensus_verdict ?? '';
  const tier     = result.data?.trl_assessment ?? '';
  const cal      = result.data?.calibration ?? {};
  const agents   = result.peer_evaluations_compiled ?? {};
  const qaoa     = result.qaoa_schedule ?? [];
  const tm       = result.token_metrics ?? null;

  // Split verdict into paragraphs for readability
  const verdictParagraphs = verdict.split(/\n\n+/).filter(p => p.trim());

  return (
    <div className="mt-2 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-900 shadow-sm animate-fade-up">

      {/* ── Top: Score + Tier ── */}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
        <ScoreRing score={score} size={52} />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <ScoreIcon s={score} size={15} />
            <span className="text-xs font-bold uppercase tracking-wide" style={{ color: scoreColor(score) }}>
              {scoreLabel(score)}
            </span>
            {tier && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border"
                style={{ background: 'rgba(99,102,241,0.08)', color: '#6366f1', borderColor: 'rgba(99,102,241,0.3)' }}>
                {tier}
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-400 font-mono">
            α={cal.alpha ?? '—'} · β={cal.beta ?? '—'} · γ={cal.gamma ?? '—'} (per-query calibration)
          </p>
        </div>
      </div>

      {/* ── Verdict ── */}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2 mb-3">
          <Brain size={14} className="text-indigo-500" />
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Chairman's Synthesis</span>
        </div>
        <div className="space-y-3">
          {verdictParagraphs.length > 0
            ? verdictParagraphs.map((p, i) => (
                <p key={i} className="text-sm text-gray-800 dark:text-gray-100 leading-7">{p.trim()}</p>
              ))
            : <p className="text-sm text-gray-500 italic">Verdict not available.</p>
          }
        </div>
      </div>

      {/* ── Agent Analysis ── */}
      <div>
        <button onClick={() => setAgOpen(v => !v)}
          className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <BookOpen size={14} className="text-gray-400" />
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Agent Analysis</span>
            <div className="flex gap-1">
              {Object.entries(AGENTS).map(([id, m]) => (
                <span key={id} className="text-sm opacity-70">{m.emoji}</span>
              ))}
            </div>
          </div>
          {agOpen ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
        </button>

        {agOpen && (
          <div className="divide-y divide-gray-100 dark:divide-gray-800 border-b border-gray-100 dark:border-gray-800">
            {Object.entries(AGENTS).map(([id, meta]) => {
              const r = agents[id];
              if (!r) return null;
              const paragraphs = (r.findings ?? '').split(/\n\n+/).filter(p => p.trim());
              return (
                <div key={id} className="px-5 py-4" style={{ borderLeftWidth: 3, borderLeftColor: meta.color }}>
                  {/* Agent header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{meta.emoji}</span>
                      <div>
                        <span className="text-sm font-bold text-gray-800 dark:text-gray-100">{meta.name}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          {r.confidence && (
                            <span className="text-[10px] font-mono font-bold" style={{ color: meta.color }}>
                              {(r.confidence * 100).toFixed(1)}%
                            </span>
                          )}
                          {r.latency_ms && <span className="text-[10px] text-gray-400 font-mono">{(r.latency_ms/1000).toFixed(1)}s</span>}
                          {r.tokens && <span className="text-[10px] text-gray-400 font-mono">~{r.tokens.toLocaleString()} tokens</span>}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setModalAgent(id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-indigo-300 hover:text-indigo-600 dark:hover:text-indigo-400 dark:hover:border-indigo-700 transition-colors"
                    >
                      <BookOpen size={11} /> Full Report
                    </button>
                  </div>

                  {/* Agent summary — first 2 paragraphs */}
                  <div className="space-y-2">
                    {paragraphs.slice(0, 2).map((p, i) => (
                      <p key={i} className="text-sm text-gray-600 dark:text-gray-400 leading-7">{p.trim()}</p>
                    ))}
                    {paragraphs.length > 2 && (
                      <button onClick={() => setModalAgent(id)}
                        className="text-xs font-semibold mt-1 flex items-center gap-1 transition-colors"
                        style={{ color: meta.color }}>
                        Read {paragraphs.length - 2} more paragraphs →
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {Object.keys(agents).length === 0 && (
              <p className="px-5 py-4 text-sm text-gray-400 italic">No agent analysis available.</p>
            )}
          </div>
        )}
      </div>

      {/* ── System Diagnostics ── */}
      <button onClick={() => setTechOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
        <div className="flex items-center gap-2">
          <Zap size={13} className="text-amber-400" />
          <span className="text-xs font-semibold text-gray-400">System Diagnostics</span>
        </div>
        {techOpen ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
      </button>

      {techOpen && (
        <div className="px-5 pb-5 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-5">

          {/* Calibration */}
          {Object.keys(cal).length > 0 && (
            <div>
              <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest mb-2">Confidence Calibration (Auto-Tuned)</p>
              <p className="text-xs text-gray-500 mb-3">The Chairman dynamically adjusts these weights based on your query type to ensure an honest final confidence score.</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Evidence (α)', val: cal.alpha, desc: 'Weight given to factual evidence' },
                  { label: 'Connector (β)', val: cal.beta, desc: 'Weight given to cross-domain links' },
                  { label: 'Skeptic (γ)', val: cal.gamma, desc: 'Penalty from skeptical critique' },
                ].map((c, i) => (
                  <div key={i} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center" title={c.desc}>
                    <p className="text-[10px] text-gray-400 font-mono mb-1">{c.label}</p>
                    <p className="text-base font-black text-gray-800 dark:text-white">{c.val ?? '—'}</p>
                    <p className="text-[9px] text-gray-400 mt-0.5 leading-tight">{c.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* QAOA -> Task Queue */}
          {qaoa.length > 0 && (
            <div>
              <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest mb-2">Internal Agent Task Queue</p>
              <p className="text-xs text-gray-500 mb-3">The system schedules agents based on priority and conflict scores to minimize API bottlenecks.</p>
              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr className="text-[10px] font-mono text-gray-400 uppercase">
                      <th className="px-3 py-2 text-left">Agent</th>
                      <th className="px-3 py-2 text-left">Slot</th>
                      <th className="px-3 py-2 text-left">Priority</th>
                      <th className="px-3 py-2 text-left">Energy</th>
                      <th className="px-3 py-2 text-left">Conflict</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {qaoa.map((q, i) => {
                      const m = AGENTS[q.agent_id] ?? {};
                      return (
                        <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="px-3 py-2.5 font-mono text-gray-600 dark:text-gray-300">{m.emoji} {q.agent_id?.replace('_agent', '')}</td>
                          <td className="px-3 py-2.5">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${q.slot === 0 ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600' : 'bg-amber-50 dark:bg-amber-900/30 text-amber-600'}`}>
                              Slot {q.slot}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden min-w-[40px]">
                                <div className="h-full rounded-full bg-indigo-400"
                                  style={{ width: `${Math.min((q.priority ?? 0) * 100, 100)}%` }} />
                              </div>
                              <span className="font-mono text-gray-600 dark:text-gray-300 text-[10px] w-10">{(q.priority ?? 0).toFixed(3)}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 font-mono font-bold text-emerald-600 dark:text-emerald-400 text-[10px]">
                            {(q.qaoa_energy ?? 0).toFixed(4)}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-violet-600 dark:text-violet-400 text-[10px]">
                            {(q.conflict_score ?? 0).toFixed(4)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Token Usage */}
          {tm && (
            <div>
              <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest mb-2">Token Usage</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                {[
                  { label: 'Used', val: (tm.tokens_used ?? 0).toLocaleString(), color: 'text-blue-600 dark:text-blue-400' },
                  { label: 'Remaining', val: (tm.tokens_remaining ?? 0).toLocaleString(), color: 'text-emerald-600 dark:text-emerald-400' },
                  { label: 'API Calls', val: tm.calls_made ?? 0, color: 'text-violet-600 dark:text-violet-400' },
                  { label: 'Cost (est)', val: `$${(tm.total_cost_usd ?? 0).toFixed(5)}`, color: 'text-amber-600 dark:text-amber-400' },
                ].map((m, i) => (
                  <div key={i} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-2.5 text-center">
                    <p className="text-[9px] font-mono text-gray-400 mb-1">{m.label}</p>
                    <p className={`text-xs font-black ${m.color}`}>{m.val}</p>
                  </div>
                ))}
              </div>
              <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                  style={{ width: `${Math.min(tm.utilization_pct ?? 0, 100)}%`, transition: 'width 1s ease' }} />
              </div>
              <p className="text-[10px] text-gray-400 font-mono mt-1 text-right">
                {(tm.utilization_pct ?? 0).toFixed(1)}% of budget · tier: {tm.current_tier ?? 'standard'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Agent full-view modal */}
      {modalAgent && (
        <AgentModal
          agentId={modalAgent}
          data={agents[modalAgent]}
          onClose={() => setModalAgent(null)}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   STREAMING VIEW
───────────────────────────────────────── */
function StreamingView({ agentResults, statusMsg, elapsed }) {
  const [thinkIdx, setThinkIdx] = useState({});
  const completed = Object.keys(agentResults).length;
  const total     = Object.keys(AGENTS).length;

  useEffect(() => {
    const t = setInterval(() => {
      setThinkIdx(prev => {
        const next = { ...prev };
        Object.keys(AGENTS).forEach(id => {
          if (!agentResults[id]) next[id] = ((prev[id] ?? 0) + 1) % AGENTS[id].think.length;
        });
        return next;
      });
    }, 1400);
    return () => clearInterval(t);
  }, [agentResults]);

  return (
    <div className="mt-2 space-y-3">
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-700"
            style={{ width: `${Math.min((completed / total) * 100, 95)}%` }} />
        </div>
        <span className="text-xs font-mono text-gray-400 whitespace-nowrap">
          {completed}/{total} agents · {elapsed}s
        </span>
      </div>

      {/* Agent cards */}
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(AGENTS).map(([id, meta]) => {
          const done = !!agentResults[id];
          const r    = agentResults[id];
          // Just show first 2 sentences from streaming result
          const preview = r?.findings?.split(/[.!?]/).filter(s => s.trim()).slice(0, 2).join('. ') + '.';
          return (
            <div key={id}
              className={`rounded-xl p-3 border transition-all duration-500 ${done
                ? 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 shadow-sm'
                : 'bg-gray-50 dark:bg-gray-800/60 border-dashed border-gray-200 dark:border-gray-700 opacity-70'}`}
              style={{ borderLeftWidth: 3, borderLeftColor: done ? meta.color : '#9ca3af' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-200">
                  {meta.emoji} {meta.short}
                </span>
                {done
                  ? <span className="text-[10px] font-mono font-bold" style={{ color: meta.color }}>
                      ✓ {r.confidence ? `${(r.confidence * 100).toFixed(0)}%` : ''}
                    </span>
                  : <span className="flex gap-0.5">
                      {[0,1,2].map(i => (
                        <span key={i} className="w-1 h-1 bg-blue-400 rounded-full animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.8s' }} />
                      ))}
                    </span>
                }
              </div>
              {done
                ? <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-3">{preview}</p>
                : <p className="text-[10px] text-gray-400 italic font-mono">{meta.think[thinkIdx[id] ?? 0]}</p>
              }
            </div>
          );
        })}
      </div>

      {/* Chairman */}
      {completed === total && (
        <div className="flex items-center gap-3 p-3.5 rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20 animate-fade-up">
          <span className="text-xl">👑</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-violet-700 dark:text-violet-300">Chairman synthesizing final verdict…</p>
            {statusMsg && <p className="text-[10px] text-violet-500 dark:text-violet-400 truncate">{statusMsg}</p>}
          </div>
          <Loader2 size={16} className="text-violet-500 animate-spin flex-shrink-0" />
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   USER BUBBLE
───────────────────────────────────────── */
function UserBubble({ msg }) {
  return (
    <div className="flex justify-end animate-slide-r">
      <div className="max-w-[78%]">
        {msg.files?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-1.5 justify-end">
            {msg.files.map((f, i) => (
              <span key={i} className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                <FileText size={10} /> {f.name}
              </span>
            ))}
          </div>
        )}
        <div className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-4 py-3 rounded-2xl rounded-tr-sm text-sm leading-relaxed shadow-sm">
          {msg.text}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   ASSISTANT BUBBLE
───────────────────────────────────────── */
function AssistantBubble({ msg, liveState }) {
  return (
    <div className="flex gap-3 animate-slide-l">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-md shadow-indigo-500/20">
        <Brain size={15} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        {msg.streaming && liveState && (
          <StreamingView
            agentResults={liveState.agentResults}
            statusMsg={liveState.statusMsg}
            elapsed={liveState.elapsed}
          />
        )}
        {!msg.streaming && msg.result && <ResultCard result={msg.result} />}
        {!msg.streaming && msg.error && (
          <div className="mt-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-xl border border-red-200 dark:border-red-800">
            ⚠️ {msg.error}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   WELCOME SCREEN
───────────────────────────────────────── */
const EXAMPLES = [
  { q: 'Who will win the 2025 ICC Cricket World Cup and why?',      tag: '🏏 Sports'     },
  { q: 'What are the top AI tools transforming healthcare in 2025?', tag: '🤖 Technology'  },
  { q: 'Is OpenAI or Google winning the AI race right now?',         tag: '📊 Analysis'   },
  { q: 'What drives inflation in emerging markets like India?',      tag: '💰 Finance'    },
  { q: 'Is CRISPR gene editing ready for human clinical use?',       tag: '🧬 BioMed'     },
  { q: 'What are the biggest geopolitical risks for 2025?',          tag: '🌍 Policy'     },
];

function WelcomeScreen({ onQuery }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-10 max-w-2xl mx-auto text-center">
      <div className="mb-6">
        <Logo size={64} />
      </div>
      <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2">
        How can NeuroNex help today?
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md leading-relaxed mb-2">
        4 specialized AI agents <span className="font-semibold text-gray-700 dark:text-gray-200">debate</span> your question from different expert perspectives — then a Chairman synthesizes a calibrated verdict.
      </p>
      <p className="text-xs text-gray-400 mb-8">
        Supports any domain · Upload PDFs, CSVs, DOCX for document analysis
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full text-left">
        {EXAMPLES.map((ex, i) => (
          <button key={i} onClick={() => onQuery(ex.q)}
            className="px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 transition-all group text-left">
            <span className="text-[10px] font-mono text-gray-400 block mb-0.5">{ex.tag}</span>
            <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 leading-snug">{ex.q}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   SIDEBAR
───────────────────────────────────────── */
function Sidebar({ sessions, activeId, onSelect, onNew, onDelete, isDark, setDark, open, setOpen, onGoHome }) {
  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={() => setOpen(false)} />
      )}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-30 w-60 flex flex-col
        bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800
        transition-transform duration-300
        ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Header */}
        <div className="px-3 py-3 flex items-center gap-2 border-b border-gray-200 dark:border-gray-800">
          <Logo size={28} withText textClass="text-sm text-gray-900 dark:text-white" />
          <div className="flex-1" />
          <button onClick={onNew} title="New chat"
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 transition-colors">
            <Plus size={15} />
          </button>
        </div>

        {/* Sessions */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {sessions.length === 0 && (
            <p className="text-[11px] text-gray-400 text-center py-8 px-3 leading-relaxed">
              No conversations yet.<br />Start asking!
            </p>
          )}
          {sessions.map(s => (
            <div key={s.id}
              onClick={() => { onSelect(s.id); setOpen(false); }}
              className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                s.id === activeId
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                  : 'hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400'
              }`}>
              <MessageSquare size={12} className="flex-shrink-0 opacity-60" />
              <span className="text-xs font-medium truncate flex-1">{s.title || 'New chat'}</span>
              <button
                onClick={e => { e.stopPropagation(); onDelete(s.id); }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:text-red-500 transition-all flex-shrink-0">
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-800 space-y-1">
          <button onClick={onGoHome}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-indigo-500 transition-all">
            <Home size={13} /> Back to Home
          </button>
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-gray-400 font-mono leading-tight px-2">gemini · neo4j · 4 agents</span>
            <button onClick={() => setDark(v => !v)}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 transition-colors">
              {isDark ? <Sun size={13} /> : <Moon size={13} />}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

/* ─────────────────────────────────────────
   FILE UPLOAD PILL (with server upload state)
───────────────────────────────────────── */
function FilePill({ file, onRemove }) {
  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono"
      style={{
        background: file.uploaded ? 'rgba(16,185,129,0.08)' : file.error ? 'rgba(239,68,68,0.08)' : 'rgba(99,102,241,0.08)',
        borderColor: file.uploaded ? 'rgba(16,185,129,0.3)' : file.error ? 'rgba(239,68,68,0.3)' : 'rgba(99,102,241,0.3)',
        color: file.uploaded ? '#10b981' : file.error ? '#ef4444' : '#6366f1',
      }}>
      {file.uploading
        ? <Loader2 size={11} className="animate-spin" />
        : file.uploaded
        ? <CheckCircle size={11} />
        : file.error
        ? <XCircle size={11} />
        : <FileText size={11} />
      }
      <span className="max-w-[100px] truncate">{file.name}</span>
      {file.uploading && <span className="opacity-60">uploading…</span>}
      {file.uploaded && <span className="opacity-60">{(file.chars / 1000).toFixed(0)}k chars</span>}
      {file.error && <span className="opacity-60">failed</span>}
      <button onClick={onRemove} className="ml-1 hover:opacity-60 transition-opacity">
        <X size={11} />
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────
   MAIN APP
───────────────────────────────────────── */
export default function NeuroNexApp() {
  /* Theme */
  const [isDark, setIsDarkRaw] = useState(() => localStorage.getItem(LS_THEME) !== 'light');
  const setDark = useCallback((v) => {
    const next = typeof v === 'function' ? v(isDark) : v;
    setIsDarkRaw(next);
    localStorage.setItem(LS_THEME, next ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', next);
  }, [isDark]);
  useEffect(() => { document.documentElement.classList.toggle('dark', isDark); }, []);

  /* Navigation */
  const navigate = useNavigate();

  /* Set body class for fixed-height layout */
  useEffect(() => {
    document.body.classList.add('chat-mode');
    return () => document.body.classList.remove('chat-mode');
  }, []);

  /* Sessions */
  const [sessions, setSessions] = useState(loadSessions);
  const [activeId, setActiveId] = useState(() => {
    const saved = localStorage.getItem(LS_ACTIVE);
    const sessions = loadSessions();
    return sessions.find(s => s.id === saved) ? saved : (sessions[0]?.id ?? null);
  });

  useEffect(() => { saveSessions(sessions); }, [sessions]);
  useEffect(() => { if (activeId) localStorage.setItem(LS_ACTIVE, activeId); }, [activeId]);

  const activeSession = sessions.find(s => s.id === activeId) ?? null;

  /* Sidebar */
  const [sideOpen, setSideOpen] = useState(false);

  /* Input */
  const [query, setQuery]     = useState('');
  const [files, setFiles]     = useState([]);   // [{name, size, contextId, uploaded, uploading, error, chars}]
  const [streaming, setStreaming] = useState(false);

  /* Live stream state */
  const [liveState, setLiveState] = useState({ agentResults: {}, statusMsg: '', elapsed: 0 });

  const esRef       = useRef(null);
  const timerRef    = useRef(null);
  const bottomRef   = useRef(null);
  const textareaRef = useRef(null);
  const fileRef     = useRef(null);

  /* Auto-scroll */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages?.length, liveState.agentResults]);

  /* Session helpers */
  const createSession = useCallback(() => {
    const s = { id: genId(), title: '', messages: [], createdAt: Date.now() };
    setSessions(prev => [s, ...prev]);
    setActiveId(s.id);
    return s.id;
  }, []);

  const deleteSession = useCallback((id) => {
    setSessions(prev => {
      const next = prev.filter(s => s.id !== id);
      if (id === activeId) setActiveId(next[0]?.id ?? null);
      return next;
    });
  }, [activeId]);

  /* File upload to backend */
  const uploadFile = async (f) => {
    const tempId = genId();
    setFiles(prev => [...prev, { id: tempId, name: f.name, size: f.size, uploading: true, uploaded: false, error: null, contextId: null, chars: 0 }]);
    try {
      const fd = new FormData();
      fd.append('file', f);
      const res = await fetch('/api/v1/upload', { method: 'POST', body: fd });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const json = await res.json();
      setFiles(prev => prev.map(fj => fj.id === tempId
        ? { ...fj, uploading: false, uploaded: true, contextId: json.context_id, chars: json.chars }
        : fj
      ));
    } catch (err) {
      setFiles(prev => prev.map(fj => fj.id === tempId
        ? { ...fj, uploading: false, error: err.message }
        : fj
      ));
    }
  };

  const handleFileSelect = (fileList) => {
    Array.from(fileList).slice(0, 5).forEach(uploadFile);
  };

  /* Submit */
  const submit = useCallback((overrideQ) => {
    const q = (overrideQ ?? query).trim();
    if (!q || streaming) return;

    // Don't allow submit if any file is still uploading
    if (files.some(f => f.uploading)) return;

    setQuery('');
    setStreaming(true);
    setLiveState({ agentResults: {}, statusMsg: 'Connecting to council…', elapsed: 0 });

    /* Get / create session */
    let sid = activeId;
    const sessionExists = sessions.find(s => s.id === sid);
    if (!sessionExists) {
      sid = genId();
      const s = { id: sid, title: q.slice(0, 50), messages: [], createdAt: Date.now() };
      setSessions(prev => [s, ...prev]);
      setActiveId(sid);
    }

    /* Collect context_ids from successfully uploaded files */
    const contextIds = files.filter(f => f.uploaded && f.contextId).map(f => f.contextId);
    const attachedFiles = files.map(f => ({ name: f.name, size: f.size }));
    setFiles([]);

    /* Add user + placeholder assistant message */
    const userMsg = { role: 'user', text: q, files: attachedFiles };
    const asstMsg = { role: 'assistant', streaming: true };
    setSessions(prev => prev.map(s => s.id === sid
      ? {
          ...s,
          title: s.messages.length === 0 ? q.slice(0, 50) : s.title,
          messages: [...s.messages, userMsg, asstMsg],
        }
      : s
    ));

    /* Start EventSource */
    const tid = `thread_${Date.now()}`;
    let url = `/api/v1/research/stream?query=${encodeURIComponent(q)}&thread_id=${tid}`;
    if (contextIds.length > 0) url += `&context_ids=${contextIds.join(',')}`;

    const es = new EventSource(url);
    esRef.current = es;

    const t0 = Date.now();
    timerRef.current = setInterval(() => {
      setLiveState(prev => ({ ...prev, elapsed: Math.floor((Date.now() - t0) / 1000) }));
    }, 500);

    const patchLastAssistant = (updater) => {
      setSessions(prev => prev.map(s => {
        if (s.id !== sid) return s;
        const msgs = [...s.messages];
        const idx  = msgs.findLastIndex(m => m.role === 'assistant' && m.streaming);
        if (idx >= 0) msgs[idx] = updater(msgs[idx]);
        return { ...s, messages: msgs };
      }));
    };

    es.addEventListener('status', e => {
      const d = JSON.parse(e.data);
      setLiveState(prev => ({ ...prev, statusMsg: d.message ?? '' }));
    });
    es.addEventListener('heartbeat', () => {});
    es.addEventListener('agent_result', e => {
      const d = JSON.parse(e.data);
      setLiveState(prev => ({ ...prev, agentResults: { ...prev.agentResults, [d.agent_id]: d } }));
    });
    es.addEventListener('synthesis', e => {
      clearInterval(timerRef.current);
      es.close();
      const result = JSON.parse(e.data);
      patchLastAssistant(() => ({ role: 'assistant', streaming: false, result }));
      setStreaming(false);
      setLiveState({ agentResults: {}, statusMsg: '', elapsed: 0 });
    });
    es.onerror = () => {
      clearInterval(timerRef.current);
      es.close();
      patchLastAssistant(() => ({
        role: 'assistant',
        streaming: false,
        error: 'Connection error. Make sure the backend is running on port 8000 and retry.',
      }));
      setStreaming(false);
    };
  }, [query, streaming, files, activeId, sessions]);

  /* Keyboard */
  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
  };

  /* Auto-resize textarea */
  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = 'auto';
    textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px';
  }, [query]);

  const messages    = activeSession?.messages ?? [];
  const showWelcome = messages.length === 0 && !streaming;
  const hasUploading = files.some(f => f.uploading);

  return (
    <div className="flex h-screen bg-white dark:bg-gray-950 overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        sessions={sessions}
        activeId={activeId}
        onSelect={setActiveId}
        onNew={createSession}
        onDelete={deleteSession}
        isDark={isDark}
        setDark={setDark}
        open={sideOpen}
        setOpen={setSideOpen}
        onGoHome={() => navigate('/')}
      />

      {/* Main panel */}
      <div className="flex-1 flex flex-col min-w-0">

        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 flex-shrink-0">
          <button onClick={() => setSideOpen(true)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors">
            <Menu size={18} />
          </button>
          <Logo size={26} withText textClass="text-sm text-gray-900 dark:text-white" />
          <div className="flex-1" />
          <button onClick={() => navigate('/')} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors" title="Home">
            <Home size={16} />
          </button>
        </div>

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto">
          {showWelcome ? (
            <WelcomeScreen onQuery={q => submit(q)} />
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
              {messages.map((msg, i) => {
                const isLastAssistant = msg.role === 'assistant' && i === messages.length - 1;
                if (msg.role === 'user')
                  return <UserBubble key={i} msg={msg} />;
                return (
                  <AssistantBubble
                    key={i}
                    msg={msg}
                    liveState={msg.streaming && isLastAssistant ? liveState : null}
                  />
                );
              })}
              <div ref={bottomRef} className="h-2" />
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-4 py-3">
          <div className="max-w-3xl mx-auto">

            {/* File chips */}
            {files.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {files.map((f, i) => (
                  <FilePill key={f.id ?? i} file={f}
                    onRemove={() => setFiles(prev => prev.filter((_, j) => j !== i))} />
                ))}
              </div>
            )}

            {/* Input box */}
            <div className={`flex items-end gap-2 rounded-2xl border shadow-sm transition-all
              ${streaming || hasUploading
                ? 'border-indigo-300 dark:border-indigo-700'
                : 'border-gray-300 dark:border-gray-700 focus-within:border-indigo-400 dark:focus-within:border-indigo-600'
              } bg-white dark:bg-gray-900 px-3 py-2`}>

              {/* File button */}
              <button onClick={() => fileRef.current?.click()} disabled={streaming}
                title="Upload document (PDF, CSV, TXT, DOCX, JSON)"
                className="p-2 rounded-xl text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 disabled:opacity-40 transition-colors flex-shrink-0">
                <Paperclip size={17} />
              </button>
              <input ref={fileRef} type="file" multiple
                accept=".pdf,.csv,.txt,.json,.jsonl,.docx,.md,.xlsx"
                className="hidden"
                onChange={e => { handleFileSelect(e.target.files); e.target.value = ''; }} />

              {/* Textarea */}
              <textarea ref={textareaRef} rows={1} value={query}
                onChange={e => setQuery(e.target.value)} onKeyDown={onKeyDown}
                disabled={streaming}
                placeholder={
                  hasUploading ? 'Uploading files…'
                  : streaming ? 'Analyzing your question…'
                  : 'Message NeuroNex… (Upload files to analyze documents)'
                }
                className="flex-1 resize-none bg-transparent py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none leading-relaxed disabled:opacity-50"
                style={{ minHeight: 40, maxHeight: 160 }} />

              {/* Send button */}
              <button onClick={() => submit()}
                disabled={(!query.trim() && files.every(f => !f.uploaded)) || streaming || hasUploading}
                className="p-2.5 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex-shrink-0 active:scale-95 shadow-sm">
                {streaming
                  ? <Loader2 size={16} className="animate-spin" />
                  : <Send size={16} />}
              </button>
            </div>

            <p className="text-center text-[10px] text-gray-400 mt-1.5">
              Enter to send · Shift+Enter for new line · Supports PDF, CSV, DOCX, TXT, JSON
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
