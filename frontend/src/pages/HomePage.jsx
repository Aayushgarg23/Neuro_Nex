import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo.jsx';
import {
  Send, Paperclip, X, FileText, Brain, Plus, Trash2,
  MessageSquare, Sun, Moon, ChevronDown, ChevronRight,
  CheckCircle, AlertTriangle, XCircle, Menu,
  Upload, Loader2, ArrowLeft, BookOpen, Zap, Home, ExternalLink,
} from 'lucide-react';

/* ─────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────── */
const AGENTS = {
  evidence_agent:  { name: 'Evidence',   emoji: '🔬', color: '#10b981', think: ['Scanning sources…', 'Cross-referencing…', 'Extracting facts…'] },
  skeptic_agent:   { name: 'Skeptic',    emoji: '⚔️',  color: '#ef4444', think: ['Auditing gaps…', 'Stress-testing…', 'Finding weaknesses…'] },
  connector_agent: { name: 'Connector',  emoji: '🔗', color: '#6366f1', think: ['Cross-domain scan…', 'Finding links…', 'Mapping patterns…'] },
  quality_agent:   { name: 'Methodology',emoji: '📋', color: '#8b5cf6', think: ['Scoring quality…', 'Checking methods…', 'Assessing data…'] },
};

const LS_SESSIONS = 'nnx_sessions_v4';
const LS_ACTIVE   = 'nnx_active_v4';
const LS_THEME    = 'nnx_theme';

const loadSessions = () => { try { return JSON.parse(localStorage.getItem(LS_SESSIONS) || '[]'); } catch { return []; } };
const saveSessions = (s) => localStorage.setItem(LS_SESSIONS, JSON.stringify(s.slice(0, 40)));
const genId = () => `s_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

/* ─────────────────────────────────────────
   CITATION TEXT RENDERER
   Turns [Source: Name, URL] into clickable chips
───────────────────────────────────────── */
function CitedText({ text, baseClass = "text-[15px] text-gray-800 dark:text-gray-100 leading-8" }) {
  if (!text) return null;
  
  // First, parse basic markdown (bold, lists, headings)
  const renderMarkdown = (str) => {
    return str.split('\n').map((line, idx) => {
      let content = line.trim();
      if (!content) return <div key={idx} className="h-2" />;
      
      // Headings
      if (content.startsWith('### ')) {
        return <h3 key={idx} className="text-lg font-bold mt-6 mb-2 text-gray-900 dark:text-white">{content.replace('### ', '')}</h3>;
      }
      if (content.startsWith('## ')) {
        return <h2 key={idx} className="text-xl font-bold mt-6 mb-2 text-gray-900 dark:text-white">{content.replace('## ', '')}</h2>;
      }
      if (content.startsWith('# ')) {
        return <h1 key={idx} className="text-2xl font-bold mt-6 mb-2 text-gray-900 dark:text-white">{content.replace('# ', '')}</h1>;
      }
      
      // Lists
      const isListItem = content.startsWith('- ') || content.startsWith('* ');
      if (isListItem) {
        content = content.substring(2);
      }
      
      // Bold syntax
      const parts = content.split(/(\*\*.*?\*\*)/g);
      const formattedContent = parts.map((p, i) => 
        p.startsWith('**') && p.endsWith('**') 
          ? <strong key={i} className="font-semibold text-gray-900 dark:text-white">{p.slice(2, -2)}</strong> 
          : p
      );

      if (isListItem) {
        return (
          <div key={idx} className="flex gap-2 mb-1.5 ml-2">
            <span className="text-gray-400 mt-1">•</span>
            <div className={baseClass} style={{ marginBottom: 0 }}>{formattedContent}</div>
          </div>
        );
      }
      return <p key={idx} className={`${baseClass} mb-4`}>{formattedContent}</p>;
    });
  };

  const parts = text.split(/\[Source:\s*([^,\]]+?)(?:,\s*(https?:\/\/[^\]]+))?\]/g);
  const result = [];
  let key = 0;
  for (let i = 0; i < parts.length; i++) {
    if (i % 3 === 0) {
      if (!parts[i]) continue;
      result.push(
        <div key={key++} className="inline-block w-full">
          {renderMarkdown(parts[i])}
        </div>
      );
    } else if (i % 3 === 1) {
      const name = parts[i]?.trim() || '';
      const url  = parts[i + 1]?.trim() || '#';
      i++;
      result.push(
        <a key={key++} href={url} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded-md text-[11px] font-semibold no-underline transition-all hover:opacity-80"
          style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.25)', transform: 'translateY(-2px)' }}>
          <ExternalLink size={9} />
          {name}
        </a>
      );
    }
  }
  return <div>{result}</div>;
}

/* ─────────────────────────────────────────
   SCORE RING  (small donut chart)
───────────────────────────────────────── */
function ScoreRing({ score, size = 52 }) {
  const r = (size / 2) - 5;
  const c = 2 * Math.PI * r;
  const d = c * Math.max(0, Math.min(1, score));
  const cx = size / 2, cy = size / 2;
  const col = score >= 0.8 ? '#10b981' : score >= 0.6 ? '#f59e0b' : '#ef4444';
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={4} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={col} strokeWidth={4}
        strokeDasharray={`${d} ${c}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 1s ease' }} />
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
        style={{ fontSize: size * 0.22, fontWeight: 800, fill: col, transform: 'rotate(90deg)', transformOrigin: `${cx}px ${cy}px` }}>
        {Math.round(score * 100)}%
      </text>
    </svg>
  );
}

/* ─────────────────────────────────────────
   RESULT CARD  — the main output card
───────────────────────────────────────── */
function ResultCard({ result }) {
  const [showAgents, setShowAgents] = useState(false);
  const [expandedAgent, setExpandedAgent] = useState(null);

  const score      = result.score ?? 0;
  const verdict    = result.data?.consensus_verdict ?? '';
  const agents     = result.peer_evaluations_compiled ?? {};
  const ragSources = result.ragSources ?? [];
  const scoreColor = score >= 0.8 ? '#10b981' : score >= 0.6 ? '#f59e0b' : '#ef4444';
  const scoreLabel = score >= 0.8 ? 'High Confidence' : score >= 0.6 ? 'Moderate Confidence' : 'Low Confidence';

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden shadow-sm">

      {/* ── Header bar ── */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800"
           style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.04), rgba(16,185,129,0.02))' }}>
        <ScoreRing score={score} size={52} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold" style={{ color: scoreColor }}>{scoreLabel}</span>
            <span className="text-xs text-gray-400">·  {(score * 100).toFixed(0)}% council consensus</span>
          </div>
          <p className="text-[11px] text-gray-400 mt-0.5">
            4 AI agents analyzed this query in parallel, grounded in live-fetched knowledge
          </p>
        </div>
        {/* Agent emoji row */}
        <div className="hidden sm:flex items-center gap-1.5">
          {Object.values(AGENTS).map((a, i) => (
            <span key={i} className="text-base" title={a.name}>{a.emoji}</span>
          ))}
        </div>
      </div>

      {/* ── RAG Sources ── */}
      {ragSources.length > 0 && (
        <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex flex-wrap gap-2 items-center">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mr-1">Sources:</span>
          {ragSources.map((s, i) => (
            <a key={i} href={s.source_url || '#'} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium no-underline border transition-colors hover:border-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-400"
              style={{ background: 'rgba(16,185,129,0.06)', borderColor: 'rgba(16,185,129,0.25)', color: '#059669' }}>
              <ExternalLink size={9} />
              {s.source_name || `Source ${i+1}`}
            </a>
          ))}
        </div>
      )}

      {/* ── Research Answer ── */}
      <div className="px-6 py-5">
        {verdict ? (
          <CitedText text={verdict} />
        ) : (
          <p className="text-[15px] text-gray-400 italic">No summary generated.</p>
        )}
      </div>

      {/* ── Agent Details (collapsible) ── */}
      {Object.keys(agents).length > 0 && (
        <div className="border-t border-gray-100 dark:border-gray-800">
          <button onClick={() => setShowAgents(v => !v)}
            className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-gray-400">View Agent Analysis</span>
              <span className="text-[10px] text-gray-300 dark:text-gray-600">({Object.keys(agents).length} specialists)</span>
            </div>
            {showAgents
              ? <ChevronDown size={13} className="text-gray-400" />
              : <ChevronRight size={13} className="text-gray-400" />}
          </button>

          {showAgents && (
            <div className="divide-y divide-gray-100 dark:divide-gray-800 border-t border-gray-100 dark:border-gray-800">
              {Object.entries(AGENTS).map(([id, meta]) => {
                const r = agents[id];
                if (!r) return null;
                const isOpen = expandedAgent === id;
                const text = r.findings ?? '';
                // Strip CONFIDENCE: line for cleaner display
                const analysis = text.replace(/CONFIDENCE:\s*[\d.]+\s*—.*/i, '').trim();
                const preview = analysis.slice(0, 240) + (analysis.length > 240 ? '…' : '');

                return (
                  <div key={id} style={{ borderLeft: `3px solid ${meta.color}` }}>
                    <button onClick={() => setExpandedAgent(isOpen ? null : id)}
                      className="w-full flex items-start gap-3 px-5 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <span className="text-lg mt-0.5">{meta.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[12px] font-bold text-gray-700 dark:text-gray-200">{meta.name}</span>
                          {r.confidence && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                              style={{ background: `${meta.color}15`, color: meta.color }}>
                              {(r.confidence * 100).toFixed(0)}%
                            </span>
                          )}
                          {r.model_used && r.model_used !== 'fallback' && (
                            <span className="text-[10px] text-gray-400 font-mono">{r.model_used}</span>
                          )}
                        </div>
                        <p className="text-[12px] text-gray-500 dark:text-gray-400 leading-relaxed">
                          {isOpen ? '' : preview}
                        </p>
                      </div>
                      <span className="text-[10px] text-gray-400 mt-1 flex-shrink-0">
                        {isOpen ? '▲' : '▼'}
                      </span>
                    </button>

                    {isOpen && (
                      <div className="px-5 pb-4 pl-14">
                        <CitedText text={analysis} baseClass="text-[13px] text-gray-700 dark:text-gray-300 leading-7" />
                        {r.citations?.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {r.citations.map((c, i) => (
                              <a key={i}
                                href={typeof c === 'object' ? (c.source_url || '#') : '#'}
                                target="_blank" rel="noopener noreferrer"
                                className="text-[10px] font-mono px-2 py-0.5 rounded-full border no-underline"
                                style={{ background: `${meta.color}0D`, borderColor: `${meta.color}30`, color: meta.color }}>
                                {typeof c === 'object' ? c.source_name : c}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   STREAMING VIEW  — shows while agents work
───────────────────────────────────────── */
function StreamingView({ liveState }) {
  const { agentResults, statusMsg, elapsed } = liveState;
  const [thinkIdx, setThinkIdx] = useState({});
  const doneCount = Object.keys(agentResults).length;
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
    }, 1200);
    return () => clearInterval(t);
  }, [agentResults]);

  return (
    <div className="space-y-3">
      {/* Status bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.06)' }}>
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${Math.min((doneCount / total) * 100, 95)}%`,
                     background: 'linear-gradient(90deg, #6366f1, #10b981)' }} />
        </div>
        <span className="text-[11px] font-mono text-gray-400 whitespace-nowrap">
          {doneCount}/{total} · {elapsed}s
        </span>
      </div>
      {statusMsg && (
        <p className="text-[11px] text-gray-400 font-medium">{statusMsg}</p>
      )}

      {/* Agent status grid */}
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(AGENTS).map(([id, meta]) => {
          const done = !!agentResults[id];
          const r    = agentResults[id];
          return (
            <div key={id}
              className={`rounded-xl px-3 py-2.5 border transition-all duration-300 ${
                done ? 'bg-white dark:bg-gray-900 shadow-sm' : 'bg-gray-50 dark:bg-gray-800/40 opacity-60'
              }`}
              style={{ borderLeft: `3px solid ${done ? meta.color : '#d1d5db'}`, borderColor: done ? `${meta.color}40` : undefined }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[12px] font-bold text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
                  {meta.emoji} {meta.name}
                </span>
                {done
                  ? <span className="text-[10px] font-bold" style={{ color: meta.color }}>
                      ✓ {r?.confidence ? `${(r.confidence * 100).toFixed(0)}%` : 'done'}
                    </span>
                  : <span className="flex gap-0.5">
                      {[0,1,2].map(i => (
                        <span key={i} className="w-1 h-1 rounded-full bg-gray-400 animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.8s' }} />
                      ))}
                    </span>
                }
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                {done
                  ? (r?.findings ?? '').slice(0, 80) + '…'
                  : meta.think[thinkIdx[id] ?? 0]}
              </p>
            </div>
          );
        })}
      </div>

      {doneCount === total && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-violet-200 dark:border-violet-800"
             style={{ background: 'rgba(139,92,246,0.06)' }}>
          <span className="text-xl">👑</span>
          <div>
            <p className="text-[12px] font-bold text-violet-700 dark:text-violet-300">Synthesizing final answer…</p>
            {statusMsg && <p className="text-[11px] text-violet-500 truncate">{statusMsg}</p>}
          </div>
          <Loader2 size={14} className="text-violet-500 animate-spin ml-auto" />
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
    <div className="flex justify-end">
      <div className="max-w-[80%]">
        {msg.files?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2 justify-end">
            {msg.files.map((f, i) => (
              <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium"
                   style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.2)' }}>
                <FileText size={11} />
                {f.name}
              </div>
            ))}
          </div>
        )}
        <div className="px-4 py-3 rounded-2xl rounded-tr-sm text-sm font-medium text-white"
             style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
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
  if (msg.streaming && liveState) {
    return (
      <div className="max-w-[95%]">
        <StreamingView liveState={liveState} />
      </div>
    );
  }
  if (msg.error) {
    return (
      <div className="px-4 py-3 rounded-2xl text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
        ⚠️ {msg.error}
      </div>
    );
  }
  if (!msg.result) return null;
  return <ResultCard result={msg.result} />;
}

/* ─────────────────────────────────────────
   FILE PILL
───────────────────────────────────────── */
function FilePill({ file, onRemove }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium border"
         style={{
           background: file.error ? 'rgba(239,68,68,0.08)' : file.uploading ? 'rgba(99,102,241,0.08)' : 'rgba(16,185,129,0.08)',
           borderColor: file.error ? 'rgba(239,68,68,0.25)' : file.uploading ? 'rgba(99,102,241,0.25)' : 'rgba(16,185,129,0.25)',
           color: file.error ? '#dc2626' : file.uploading ? '#6366f1' : '#059669',
         }}>
      {file.uploading ? <Loader2 size={10} className="animate-spin" /> : <FileText size={10} />}
      <span className="max-w-[120px] truncate">{file.name}</span>
      {file.uploaded && <span className="text-[9px] opacity-60">{Math.round(file.chars/1000)}k chars</span>}
      {!file.uploading && (
        <button onClick={onRemove} className="ml-1 opacity-50 hover:opacity-100 transition-opacity">
          <X size={10} />
        </button>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   SIDEBAR
───────────────────────────────────────── */
function Sidebar({ sessions, activeId, onSelect, onNew, onDelete, isDark, setDark, open, setOpen, onGoHome }) {
  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={() => setOpen(false)} />
      )}

      <aside className={`
        fixed md:relative z-40 md:z-auto
        flex flex-col h-full
        w-64 flex-shrink-0
        border-r border-gray-200 dark:border-gray-800
        bg-gray-50 dark:bg-gray-900
        transition-transform duration-200
        ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-gray-800">
          <button onClick={onGoHome} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Logo size={28} withText textClass="text-sm font-bold text-gray-900 dark:text-white" />
          </button>
          <button onClick={() => setOpen(false)} className="md:hidden p-1 rounded-lg text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>

        {/* New chat */}
        <div className="px-3 pt-3 pb-2">
          <button onClick={onNew}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all bg-white dark:bg-gray-800">
            <Plus size={15} />
            New Research
          </button>
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto px-3 py-1 space-y-0.5">
          {sessions.length === 0 && (
            <p className="text-center text-[11px] text-gray-400 py-8">No conversations yet</p>
          )}
          {sessions.map(s => (
            <div key={s.id}
              className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                s.id === activeId
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              onClick={() => onSelect(s.id)}>
              <MessageSquare size={13} className="flex-shrink-0 opacity-60" />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium truncate">{s.title || 'New Research'}</p>
                <p className="text-[10px] opacity-50">{timeAgo(s.createdAt)}</p>
              </div>
              <button onClick={e => { e.stopPropagation(); onDelete(s.id); }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-400 hover:text-red-500 transition-all flex-shrink-0">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>

        {/* Bottom controls */}
        <div className="border-t border-gray-200 dark:border-gray-800 px-3 py-3 flex items-center justify-between">
          <span className="text-[10px] font-mono text-gray-400">gemini · neo4j · 4 agents</span>
          <button onClick={() => setDark(d => !d)}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </aside>
    </>
  );
}

/* ─────────────────────────────────────────
   WELCOME SCREEN
───────────────────────────────────────── */
const EXAMPLES = [
  "How to get an AI dev job in 2026 as a fresher?",
  "What are the biggest trends shaping AI research right now?",
  "Explain transformer architecture and attention mechanism",
  "Is OpenAI or Google winning the AI race?",
  "How does RAG (Retrieval Augmented Generation) actually work?",
  "What is the significance of 'Attention is All You Need'?",
];

function WelcomeScreen({ onQuery }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-full px-4 py-16 text-center">
      <div className="mb-6 p-4 rounded-3xl" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(16,185,129,0.08))' }}>
        <Brain size={40} className="text-indigo-600" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">NeuroNex Research AI</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-10">
        4 specialized AI agents debate your question, grounded in live-fetched knowledge from Wikipedia, ArXiv, and more.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-xl w-full">
        {EXAMPLES.map((ex, i) => (
          <button key={i} onClick={() => onQuery(ex)}
            className="px-4 py-3 rounded-xl text-left text-[12px] text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all">
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   MAIN APP
───────────────────────────────────────── */
export default function HomePage() {
  const navigate = useNavigate();
  const [sessions,   setSessions ] = useState(() => loadSessions());
  const [activeId,   setActiveId ] = useState(() => localStorage.getItem(LS_ACTIVE) || null);
  const [isDark,     setDark     ] = useState(() => localStorage.getItem(LS_THEME) === 'dark');
  const [sideOpen,   setSideOpen ] = useState(false);
  const [query,      setQuery    ] = useState('');
  const [domain,     setDomain   ] = useState('general');
  const [streaming,  setStreaming ] = useState(false);
  const [files,      setFiles    ] = useState([]);
  const [liveState,  setLiveState] = useState({ agentResults: {}, statusMsg: '', elapsed: 0, ragSources: [] });

  const esRef       = useRef(null);
  const timerRef    = useRef(null);
  const bottomRef   = useRef(null);
  const textareaRef = useRef(null);
  const fileRef     = useRef(null);

  // Persist dark mode
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem(LS_THEME, isDark ? 'dark' : 'light');
  }, [isDark]);

  // Persist sessions
  useEffect(() => { saveSessions(sessions); }, [sessions]);
  useEffect(() => {
    if (activeId) localStorage.setItem(LS_ACTIVE, activeId);
  }, [activeId]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sessions, liveState.agentResults]);

  const activeSession = sessions.find(s => s.id === activeId) ?? null;

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

  /* File upload */
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

  /* Submit query */
  const submit = useCallback((overrideQ) => {
    const q = (overrideQ ?? query).trim();
    if (!q || streaming) return;
    if (files.some(f => f.uploading)) return;

    setQuery('');
    setStreaming(true);
    setLiveState({ agentResults: {}, statusMsg: 'Starting agents…', elapsed: 0, ragSources: [] });

    // Get or create session
    let sid = activeId;
    const sessionExists = sessions.find(s => s.id === sid);
    if (!sessionExists) {
      sid = genId();
      const s = { id: sid, title: q.slice(0, 50), messages: [], createdAt: Date.now() };
      setSessions(prev => [s, ...prev]);
      setActiveId(sid);
    }

    const contextIds    = files.filter(f => f.uploaded && f.contextId).map(f => f.contextId);
    const attachedFiles = files.map(f => ({ name: f.name, size: f.size }));
    setFiles([]);

    const userMsg = { role: 'user', text: q, files: attachedFiles };
    const asstMsg = { role: 'assistant', streaming: true };
    setSessions(prev => prev.map(s => s.id === sid
      ? { ...s, title: s.messages.length === 0 ? q.slice(0, 50) : s.title, messages: [...s.messages, userMsg, asstMsg] }
      : s
    ));

    // EventSource stream
    const tid = `thread_${Date.now()}`;
    let url = `/api/v1/research/stream?query=${encodeURIComponent(q)}&thread_id=${tid}&domain=${domain}`;
    if (contextIds.length > 0) url += `&context_ids=${contextIds.join(',')}`;

    const es = new EventSource(url);
    esRef.current = es;

    const t0 = Date.now();
    timerRef.current = setInterval(() => {
      setLiveState(prev => ({ ...prev, elapsed: Math.floor((Date.now() - t0) / 1000) }));
    }, 500);

    const patchLast = (updater) => {
      setSessions(prev => prev.map(s => {
        if (s.id !== sid) return s;
        const msgs = [...s.messages];
        const idx  = msgs.findLastIndex(m => m.role === 'assistant' && m.streaming);
        if (idx >= 0) msgs[idx] = updater(msgs[idx]);
        return { ...s, messages: msgs };
      }));
    };

    let latestRagSources = [];

    es.addEventListener('status', e => {
      const d = JSON.parse(e.data);
      setLiveState(prev => ({ ...prev, statusMsg: d.message ?? '' }));
    });
    es.addEventListener('heartbeat', () => {});
    es.addEventListener('rag_status', e => {
      const d = JSON.parse(e.data);
      latestRagSources = d.citations ?? [];
      setLiveState(prev => ({ ...prev, ragSources: latestRagSources }));
    });
    es.addEventListener('agent_result', e => {
      const d = JSON.parse(e.data);
      setLiveState(prev => ({ ...prev, agentResults: { ...prev.agentResults, [d.agent_id]: d } }));
    });
    es.addEventListener('synthesis', e => {
      clearInterval(timerRef.current);
      es.close();
      const result = JSON.parse(e.data);
      patchLast(() => ({ role: 'assistant', streaming: false, result: { ...result, ragSources: latestRagSources } }));
      setStreaming(false);
      setLiveState({ agentResults: {}, statusMsg: '', elapsed: 0, ragSources: [] });
    });
    es.onerror = () => {
      clearInterval(timerRef.current);
      es.close();
      patchLast(() => ({ role: 'assistant', streaming: false, error: 'Connection error. Make sure the backend is running on port 8000.' }));
      setStreaming(false);
    };
  }, [query, streaming, files, activeId, sessions, domain]);

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
  };

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = 'auto';
    textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px';
  }, [query]);

  const messages    = activeSession?.messages ?? [];
  const showWelcome = messages.length === 0 && !streaming;
  const hasUploading = files.some(f => f.uploading);

  return (
    <div className={`flex h-screen overflow-hidden ${isDark ? 'dark' : ''}`}
         style={{ background: isDark ? '#09090b' : '#ffffff' }}>

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

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Mobile header */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex-shrink-0 bg-white dark:bg-gray-950">
          <button onClick={() => setSideOpen(true)} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <Menu size={18} />
          </button>
          <Logo size={24} withText textClass="text-sm font-bold text-gray-900 dark:text-white" />
        </div>

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto">
          {showWelcome ? (
            <WelcomeScreen onQuery={q => submit(q)} />
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
              {messages.map((msg, i) => {
                const isLastAssistant = msg.role === 'assistant' && i === messages.length - 1;
                if (msg.role === 'user') return <UserBubble key={i} msg={msg} />;
                return (
                  <AssistantBubble
                    key={i}
                    msg={msg}
                    liveState={msg.streaming && isLastAssistant ? liveState : null}
                  />
                );
              })}
              <div ref={bottomRef} className="h-4" />
            </div>
          )}
        </div>

        {/* Input bar */}
        <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-4 py-4">
          <div className="max-w-3xl mx-auto space-y-2">

            {/* Domain pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mr-1">Domain:</span>
              {['general','medical','legal','finance','technology','science'].map(d => (
                <button key={d} onClick={() => setDomain(d)} disabled={streaming}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all disabled:opacity-50 ${
                    domain === d
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'text-gray-500 border-gray-200 dark:border-gray-700 hover:border-indigo-400 hover:text-indigo-600 dark:bg-gray-900'
                  }`}>
                  {d}
                </button>
              ))}
            </div>

            {/* File chips */}
            {files.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {files.map((f, i) => (
                  <FilePill key={f.id ?? i} file={f}
                    onRemove={() => setFiles(prev => prev.filter((_, j) => j !== i))} />
                ))}
              </div>
            )}

            {/* Input box */}
            <div className={`flex items-end gap-2 rounded-2xl border shadow-sm transition-all px-3 py-2
              ${streaming ? 'border-indigo-300 dark:border-indigo-700' : 'border-gray-300 dark:border-gray-700 focus-within:border-indigo-400'}
              bg-white dark:bg-gray-900`}>

              <button onClick={() => fileRef.current?.click()} disabled={streaming}
                title="Upload document"
                className="p-2 rounded-xl text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 disabled:opacity-40 transition-colors flex-shrink-0">
                <Paperclip size={17} />
              </button>
              <input ref={fileRef} type="file" multiple
                accept=".pdf,.csv,.txt,.json,.jsonl,.docx,.md,.xlsx"
                className="hidden"
                onChange={e => { handleFileSelect(e.target.files); e.target.value = ''; }} />

              <textarea ref={textareaRef} rows={1} value={query}
                onChange={e => setQuery(e.target.value)} onKeyDown={onKeyDown}
                disabled={streaming}
                placeholder={
                  hasUploading ? 'Uploading files…'
                  : streaming ? 'Analyzing…'
                  : `Ask anything… [${domain}]`
                }
                className="flex-1 resize-none bg-transparent py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none leading-relaxed disabled:opacity-50"
                style={{ minHeight: 40, maxHeight: 160 }} />

              <button onClick={() => submit()}
                disabled={(!query.trim() && files.every(f => !f.uploaded)) || streaming || hasUploading}
                className="p-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex-shrink-0 active:scale-95 shadow-sm">
                {streaming
                  ? <Loader2 size={16} className="animate-spin" />
                  : <Send size={16} />}
              </button>
            </div>

            <p className="text-center text-[10px] text-gray-400">
              Enter to send · Shift+Enter for new line · Upload PDF, CSV, DOCX, TXT
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
