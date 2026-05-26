import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo.jsx';
import {
  ArrowRight, CheckCircle, ChevronRight, Star,
  Zap, Shield, Globe2, BarChart3, FlaskConical, Landmark,
  Swords, Link2, ClipboardList, Crown,
  FileText, Database, Search, BookOpen,
} from 'lucide-react';

/* ─── AGENT DATA ─────────────────────────────────────────────── */
const AGENTS = [
  {
    id: 'evidence',
    emoji: '🔬',
    name: 'Evidence Agent',
    color: '#10b981',
    bg: 'rgba(16,185,129,0.08)',
    border: 'rgba(16,185,129,0.25)',
    tagline: 'The Data Archaeologist',
    desc: 'Exhaustively mines data sources, academic research, statistics, historical records, and expert consensus. Presents only verifiable, cited facts — never speculation.',
    bullets: ['Named entities, statistics, dates', 'Historical precedents & trends', 'Multi-source cross-referencing', 'Quantified evidence scoring'],
  },
  {
    id: 'skeptic',
    emoji: '⚔️',
    name: 'Skeptic Agent',
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.25)',
    tagline: 'The Intellectual Adversary',
    desc: "Actively hunts for methodological flaws, biases, counter-examples, and hidden assumptions in any claim. The strongest critic of the evidence agent's findings.",
    bullets: ['Publication bias detection', 'Counter-example discovery', 'Confidence uncertainty quantification', 'Assumption stress-testing'],
  },
  {
    id: 'connector',
    emoji: '🔗',
    name: 'Connector Agent',
    color: '#6366f1',
    bg: 'rgba(99,102,241,0.08)',
    border: 'rgba(99,102,241,0.25)',
    tagline: 'The Cross-Domain Polymath',
    desc: 'Finds non-obvious connections between your query and adjacent fields — drawing parallels from history, economics, physics, psychology, and more.',
    bullets: ['Multi-hop knowledge traversal', 'Cross-domain analogies', 'Second-order consequence mapping', 'Hidden pattern recognition'],
  },
  {
    id: 'quality',
    emoji: '📋',
    name: 'Methodology Agent',
    color: '#8b5cf6',
    bg: 'rgba(139,92,246,0.08)',
    border: 'rgba(139,92,246,0.25)',
    tagline: 'The Rigor Enforcer',
    desc: 'Audits the analytical framework itself — evaluating data quality, methodology gaps, source reliability, and produces a readiness score for decision-making.',
    bullets: ['Analytical framework assessment', 'Data quality scoring', 'Methodology gap identification', 'Decision-readiness rating'],
  },
];

/* ─── USE CASES ──────────────────────────────────────────────── */
const USE_CASES = [
  { icon: FlaskConical, label: 'Science & Research', color: '#10b981', desc: 'Drug efficacy, gene pathways, clinical research synthesis' },
  { icon: BarChart3,   label: 'Finance & Markets',   color: '#f59e0b', desc: 'Stock analysis, economic forecasting, investment risk' },
  { icon: Globe2,      label: 'Geopolitics',          color: '#3b82f6', desc: 'Policy impacts, conflict analysis, diplomatic forecasting' },
  { icon: Zap,         label: 'Technology',           color: '#6366f1', desc: 'AI/ML evaluation, framework comparison, tech strategy' },
  { icon: Star,        label: 'Sports Analytics',     color: '#ef4444', desc: 'Team performance, outcome prediction, historical records' },
  { icon: Landmark,    label: 'Law & Compliance',     color: '#8b5cf6', desc: 'Regulatory analysis, precedent research, risk assessment' },
];

/* ─── COMPARISON ─────────────────────────────────────────────── */
const COMPARE_ROWS = [
  { label: 'Multi-agent debate',         nn: true,  gpt: false, gemini: false },
  { label: 'Calibrated confidence score',nn: true,  gpt: false, gemini: false },
  { label: 'Built-in devil\'s advocate', nn: true,  gpt: false, gemini: false },
  { label: 'Document upload & analysis', nn: true,  gpt: true,  gemini: true  },
  { label: 'Cross-domain connections',   nn: true,  gpt: false, gemini: false },
  { label: 'Methodology audit layer',    nn: true,  gpt: false, gemini: false },
  { label: 'Persistent chat history',    nn: true,  gpt: true,  gemini: true  },
  { label: 'Single-source honesty risk', nn: false, gpt: true,  gemini: true  },
];

/* ─── HOW IT WORKS ───────────────────────────────────────────── */
const STEPS = [
  { n:'01', title:'You ask anything', desc:'Paste a question, upload a PDF/CSV/DOCX, or compare two documents. Any domain, any depth.' },
  { n:'02', title:'4 agents debate in parallel', desc:'All 4 specialist agents analyze simultaneously — each from their unique perspective, in under 30 seconds.' },
  { n:'03', title:'Chairman synthesizes', desc:'The Chairman reads all 4 reports and writes a comprehensive, calibrated verdict with a dynamic confidence score.' },
  { n:'04', title:'You read the full picture', desc:'See the complete verdict, drill into any agent\'s full report, and understand exactly how confident to be.' },
];

/* ─── STAT COUNTER ───────────────────────────────────────────── */
function StatBar() {
  const stats = [
    { val: '4×', label: 'Expert perspectives per query' },
    { val: '8+', label: 'Domains supported' },
    { val: '8K', label: 'Max tokens per agent' },
    { val: '~30s', label: 'Average response time' },
  ];
  return (
    <div className="border-y border-white/10 py-10 my-20">
      <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
        {stats.map((s, i) => (
          <div key={i} className="text-center">
            <div className="text-3xl md:text-4xl font-black gradient-text mb-1">{s.val}</div>
            <div className="text-sm text-slate-400">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── NAVBAR ─────────────────────────────────────────────────── */
function Navbar({ navigate }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'glass border-b border-white/10 shadow-xl shadow-black/20' : ''}`}>
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Logo size={36} withText textClass="text-white text-lg" />
        <div className="hidden md:flex items-center gap-8 text-sm text-slate-300">
          <a href="#how" className="hover:text-white transition-colors">How it works</a>
          <a href="#agents" className="hover:text-white transition-colors">Agents</a>
          <a href="#compare" className="hover:text-white transition-colors">Compare</a>
          <a href="#usecases" className="hover:text-white transition-colors">Use Cases</a>
        </div>
        <button
          onClick={() => navigate('/chat')}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all active:scale-95 shadow-lg shadow-violet-500/30"
        >
          Open Research Console
          <ArrowRight size={14} />
        </button>
      </div>
    </nav>
  );
}

/* ─── HERO ANIMATION — constellation ─────────────────────────── */
function HeroLogo() {
  return (
    <div className="relative w-48 h-48 mx-auto mb-10 animate-float">
      {/* Outer rings */}
      <div className="absolute inset-0 rounded-full border border-violet-500/20 animate-pulse-ring" style={{ animationDelay: '0s' }} />
      <div className="absolute inset-4 rounded-full border border-blue-500/15 animate-pulse-ring" style={{ animationDelay: '0.5s' }} />

      {/* Glow blob */}
      <div className="absolute inset-0 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.3) 0%, transparent 70%)' }} />

      {/* Logo */}
      <div className="absolute inset-0 flex items-center justify-center">
        <Logo size={100} />
      </div>

      {/* Orbiting agent dots */}
      {[
        { color: '#10b981', top: '4%',   left: '50%', label: '🔬' },
        { color: '#ef4444', top: '50%',  left: '96%', label: '⚔️' },
        { color: '#6366f1', top: '96%',  left: '50%', label: '🔗' },
        { color: '#8b5cf6', top: '50%',  left: '4%',  label: '📋' },
      ].map((d, i) => (
        <div key={i}
          className="absolute w-9 h-9 rounded-full flex items-center justify-center text-base shadow-lg animate-pulse-ring"
          style={{
            top: d.top, left: d.left, transform: 'translate(-50%,-50%)',
            background: `${d.color}22`, border: `1.5px solid ${d.color}66`,
            animationDelay: `${i * 0.3}s`,
          }}>
          {d.label}
        </div>
      ))}
    </div>
  );
}

/* ─── MAIN LANDING PAGE ──────────────────────────────────────── */
export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#050508] text-white overflow-x-hidden">

      {/* ── Navbar ── */}
      <Navbar navigate={navigate} />

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-20 grid-pattern noise">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 65%)' }} />
          <div className="absolute top-1/2 left-1/4 w-[300px] h-[300px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 65%)' }} />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-xs text-violet-300 font-medium mb-8 animate-fade-up">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            AI-Powered Multi-Agent Research Platform
          </div>

          {/* Logo animation */}
          <HeroLogo />

          {/* Headline */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black leading-tight mb-6 animate-fade-up delay-100">
            Don't trust one AI.<br />
            <span className="gradient-text">Make four debate.</span>
          </h1>

          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-up delay-200">
            NeuroNex deploys four specialist AI agents that simultaneously argue, critique, connect, and audit your research question —
            then a Chairman synthesizes a <strong className="text-white">calibrated confidence verdict</strong> you can actually trust.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10 animate-fade-up delay-300">
            <button
              onClick={() => navigate('/chat')}
              className="flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-bold px-8 py-4 rounded-2xl transition-all shadow-2xl shadow-violet-500/30 active:scale-95 text-base"
            >
              Start Researching Free
              <ArrowRight size={18} />
            </button>
            <a href="#how"
              className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold px-8 py-4 rounded-2xl transition-all text-base">
              See How It Works
              <ChevronRight size={18} />
            </a>
          </div>

          {/* Social proof */}
          <p className="text-xs text-slate-500 animate-fade-up delay-400">
            No account required · Supports PDF, CSV, DOCX, TXT, JSON · Any research domain
          </p>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce text-slate-500">
          <span className="text-xs">Scroll to explore</span>
          <ChevronRight size={16} style={{ transform: 'rotate(90deg)' }} />
        </div>
      </section>

      {/* ── Stats ── */}
      <StatBar />

      {/* ── Problem ── */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <p className="text-violet-400 font-semibold text-sm uppercase tracking-widest mb-3">The Problem</p>
          <h2 className="text-3xl md:text-5xl font-black mb-6">
            Single AI = Single point of failure
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
            ChatGPT, Gemini, Claude — they're brilliant. But they give you one confident answer with no internal debate, no self-criticism, no confidence calibration. You can't tell when they're right and when they're hallucinating.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: '⚠️', title: 'No Self-Criticism', desc: 'Standard LLMs never actively argue against their own answer. There\'s no devil\'s advocate in the pipeline.' },
            { icon: '📉', title: 'No Confidence Score', desc: 'You get "probably" or "it seems" — never a mathematically calibrated probability you can act on.' },
            { icon: '🔮', title: 'No Cross-Domain Insight', desc: 'Answers stay in one conceptual lane. The surprising connections between fields — never surfaced.' },
          ].map((p, i) => (
            <div key={i} className="glass rounded-2xl p-6 border border-white/5">
              <div className="text-3xl mb-4">{p.icon}</div>
              <h3 className="font-bold text-lg mb-2 text-white">{p.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how" className="py-24 relative">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-violet-400 font-semibold text-sm uppercase tracking-widest mb-3">The Process</p>
            <h2 className="text-3xl md:text-5xl font-black mb-4">How NeuroNex works</h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">Four agents. One chairman. Calibrated truth.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {STEPS.map((s, i) => (
              <div key={i} className="glass rounded-2xl p-6 border border-white/5 hover:border-violet-500/30 transition-colors group">
                <div className="flex items-start gap-4">
                  <span className="text-4xl font-black gradient-text opacity-60 group-hover:opacity-100 transition-opacity leading-none">
                    {s.n}
                  </span>
                  <div>
                    <h3 className="font-bold text-lg text-white mb-2">{s.title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Agents ── */}
      <section id="agents" className="py-24 max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-violet-400 font-semibold text-sm uppercase tracking-widest mb-3">The Council</p>
          <h2 className="text-3xl md:text-5xl font-black mb-4">Meet your research council</h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Each agent is a specialist with a distinct mandate. They run in parallel — no agent influences another until the Chairman reads all reports.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-5 mb-8">
          {AGENTS.map((a, i) => (
            <div key={i}
              className="rounded-2xl p-6 border transition-all hover:scale-[1.01] cursor-default group"
              style={{ background: a.bg, borderColor: a.border }}>
              <div className="flex items-start gap-4 mb-4">
                <span className="text-3xl">{a.emoji}</span>
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest mb-0.5" style={{ color: a.color }}>{a.tagline}</div>
                  <h3 className="text-lg font-black text-white">{a.name}</h3>
                </div>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed mb-4">{a.desc}</p>
              <ul className="space-y-1">
                {a.bullets.map((b, j) => (
                  <li key={j} className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: a.color }} />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Chairman card */}
        <div className="rounded-2xl p-6 border border-violet-500/25 text-center"
          style={{ background: 'rgba(124,58,237,0.08)' }}>
          <div className="text-4xl mb-3">👑</div>
          <h3 className="text-xl font-black text-white mb-2">The Chairman</h3>
          <p className="text-slate-300 text-sm max-w-2xl mx-auto leading-relaxed">
            After all 4 agents complete their full-depth reports, the Chairman reads every word and writes a comprehensive,
            multi-paragraph synthesis — domain-specific, calibrated, and honest about uncertainty. Not a summary. A <strong className="text-white">verdict</strong>.
          </p>
        </div>
      </section>

      {/* ── Document capability ── */}
      <section className="py-20 max-w-5xl mx-auto px-6">
        <div className="glass rounded-3xl p-8 md:p-12 border border-white/5">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <p className="text-violet-400 font-semibold text-sm uppercase tracking-widest mb-3">Document Intelligence</p>
              <h2 className="text-3xl font-black text-white mb-4">Not just questions — analyze your documents</h2>
              <p className="text-slate-400 leading-relaxed mb-6">
                Upload your research papers, company reports, financial statements, or any document. All 4 agents apply their specialist lenses to your actual content — not just general knowledge.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: FileText, label: 'PDF papers & reports' },
                  { icon: BarChart3, label: 'CSV & Excel data' },
                  { icon: Database, label: 'JSON & structured data' },
                  { icon: BookOpen, label: 'DOCX documents' },
                ].map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-slate-300">
                    <f.icon size={14} className="text-violet-400 flex-shrink-0" />
                    {f.label}
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              {[
                { title: 'Research synthesis', desc: 'Upload 2+ papers — agents find consensus and conflicts' },
                { title: 'Financial analysis', desc: 'Upload annual report — get risk assessment + opportunities' },
                { title: 'Competitive comparison', desc: 'Upload competitor docs — get strategic analysis' },
                { title: 'Data interpretation', desc: 'Upload CSV — agents interpret trends and anomalies' },
              ].map((u, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                  <CheckCircle size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-white">{u.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{u.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Comparison ── */}
      <section id="compare" className="py-24 max-w-5xl mx-auto px-6">
        <div className="text-center mb-14">
          <p className="text-violet-400 font-semibold text-sm uppercase tracking-widest mb-3">Comparison</p>
          <h2 className="text-3xl md:text-4xl font-black mb-4">Why NeuroNex instead of ChatGPT or Gemini?</h2>
          <p className="text-slate-400 max-w-xl mx-auto">They're general-purpose assistants. NeuroNex is a structured research engine.</p>
        </div>

        <div className="rounded-2xl border border-white/10 overflow-hidden">
          <div className="grid grid-cols-4 bg-white/5 border-b border-white/10">
            <div className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Feature</div>
            <div className="p-4 text-center border-l border-white/10">
              <Logo size={20} withText textClass="text-sm text-white" />
            </div>
            <div className="p-4 text-center border-l border-white/10 text-sm font-semibold text-slate-300">ChatGPT</div>
            <div className="p-4 text-center border-l border-white/10 text-sm font-semibold text-slate-300">Gemini</div>
          </div>
          {COMPARE_ROWS.map((row, i) => (
            <div key={i} className={`grid grid-cols-4 border-b border-white/5 transition-colors hover:bg-white/3 ${i % 2 === 0 ? '' : 'bg-white/2'}`}>
              <div className="p-4 text-sm text-slate-300">{row.label}</div>
              {[row.nn, row.gpt, row.gemini].map((val, j) => (
                <div key={j} className="p-4 flex justify-center items-center border-l border-white/5">
                  {val
                    ? <CheckCircle size={18} className="text-emerald-400" />
                    : <span className="w-4 h-0.5 bg-slate-600 rounded" />}
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ── Use Cases ── */}
      <section id="usecases" className="py-24 max-w-5xl mx-auto px-6">
        <div className="text-center mb-14">
          <p className="text-violet-400 font-semibold text-sm uppercase tracking-widest mb-3">Use Cases</p>
          <h2 className="text-3xl md:text-4xl font-black mb-4">Any domain. Any depth.</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {USE_CASES.map((u, i) => (
            <div key={i}
              className="glass rounded-2xl p-5 border border-white/5 hover:border-white/15 transition-all group">
              <u.icon size={22} style={{ color: u.color }} className="mb-3" />
              <h3 className="font-bold text-white text-sm mb-1">{u.label}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{u.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-32 relative">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(124,58,237,0.15) 0%, transparent 70%)' }} />
        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-6xl font-black mb-6">
            Ready to think<br />
            <span className="gradient-text">4× deeper?</span>
          </h2>
          <p className="text-slate-400 text-lg mb-10 max-w-xl mx-auto leading-relaxed">
            Stop trusting single-model answers for research that matters. Let four expert AI agents debate your question and give you a verdict you can act on.
          </p>
          <button
            onClick={() => navigate('/chat')}
            className="inline-flex items-center gap-3 bg-violet-600 hover:bg-violet-500 text-white font-bold px-10 py-5 rounded-2xl text-lg transition-all shadow-2xl shadow-violet-500/30 active:scale-95"
          >
            Open NeuroNex Research Console
            <ArrowRight size={22} />
          </button>
          <p className="text-slate-600 text-xs mt-6">
            Free to use · No account needed · Supports all file types
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 py-10">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <Logo size={28} withText textClass="text-slate-300 text-sm" />
          <p className="text-xs text-slate-600 text-center">
            Multi-Agent GraphRAG Platform · 4 Agents · 1 Chairman · Calibrated Confidence
          </p>
          <p className="text-xs text-slate-600">NeuroNex © 2025</p>
        </div>
      </footer>
    </div>
  );
}
