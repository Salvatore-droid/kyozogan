import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import {
  Eye, Cpu, AlertTriangle, Shield, Activity, RefreshCw,
  ChevronRight, Clock, Globe, Zap, Brain, Terminal,
  Radio, Lock, Layers, TrendingUp, Hash, Target,
  Crosshair, FlaskConical, Wifi, WifiOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LiveSession {
  session_id: string;
  domain: string;
  ip_address: string;
  threat_level: 'low' | 'medium' | 'high' | 'critical';
  backend_type: 'real' | 'deceptive';
  engagement_status: 'learning' | 'analyzing' | 'deceiving';
  interaction_count: number;
  start_time: string;
  last_activity: string;
  detected_techniques: string[];
  eval_tier?: number;
  score?: number;
  deception_strategy?: string;
  swap_approved?: boolean;
}

interface DecoyInteraction {
  ts: string;
  method: string;
  path: string;
  technique: string;
  goal: string;
  code: number;
  note: string;
}

interface TierBreakdown {
  flagged: boolean;
  tier: number;
  score: number;
  threat_level: string;
  techniques: string[];
  reasons: string[];
  deception_strategy: string;
  confidence: number;
  ai_powered: boolean;
  explanation: string;
  soft_isolation: boolean;
  tier1_triggers: string[];
  tier2_breakdown: Record<string, number>;
  tier3_analysis: Record<string, unknown>;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const THREAT = {
  critical: { label: 'Critical', color: '#EF4444', bg: '#EF444418', pulse: true },
  high:     { label: 'High',     color: '#F97316', bg: '#F9731618', pulse: true },
  medium:   { label: 'Medium',   color: '#EAB308', bg: '#EAB30818', pulse: false },
  low:      { label: 'Low',      color: '#22C55E', bg: '#22C55E18', pulse: false },
} as const;

const STRATEGY_COLOR: Record<string, string> = {
  contain:  '#EF4444',
  isolate:  '#F97316',
  lure:     '#A855F7',
  monitor:  '#3B82F6',
};

const TIER_COLOR: Record<number, string> = { 1: '#EF4444', 2: '#F97316', 3: '#A855F7' };
const TIER_LABEL: Record<number, string> = {
  1: 'T1 — Wiretrap',
  2: 'T2 — Behavioural',
  3: 'T3 — AI Intent',
};

function ago(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60)  return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  return `${Math.floor(s/3600)}h ago`;
}

function duration(start: string) {
  const m = Math.floor((Date.now() - new Date(start).getTime()) / 60000);
  if (m < 1)  return '<1m';
  if (m < 60) return `${m}m`;
  return `${Math.floor(m/60)}h ${m%60}m`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PulsingDot({ color }: { color: string }) {
  return (
    <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
        style={{ backgroundColor: color }} />
      <span className="relative inline-flex rounded-full h-2.5 w-2.5"
        style={{ backgroundColor: color }} />
    </span>
  );
}

function StatBadge({ icon: Icon, label, value, accent }:
  { icon: React.ElementType; label: string; value: string | number; accent?: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 border border-border bg-card">
      <Icon size={13} style={{ color: accent || 'var(--muted-foreground)' }} />
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <span className="text-sm font-black font-mono ml-auto" style={accent ? { color: accent } : undefined}>
        {value}
      </span>
    </div>
  );
}

function TierPill({ tier, score }: { tier: number; score?: number }) {
  const color = TIER_COLOR[tier] || '#6B7280';
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border"
      style={{ color, borderColor: color + '50', backgroundColor: color + '18' }}>
      <Layers size={9} />
      {TIER_LABEL[tier] || `Tier ${tier}`}
      {score !== undefined && <span className="ml-1 font-mono">{score}</span>}
    </span>
  );
}

// ─── Decoy Activity Feed ──────────────────────────────────────────────────────

function DecoyFeed({ sessionId }: { sessionId: string }) {
  const [items, setItems] = useState<DecoyInteraction[]>([]);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(
          `/api/swap/decoy-history/?session_id=${sessionId}`,
          { headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` } }
        );
        if (!cancelled && res.ok) {
          const data = await res.json();
          setItems(data.interactions || []);
        }
      } catch {
        // silently fail — history may not be available yet
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, 5000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [sessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [items]);

  const METHOD_COLOR: Record<string, string> = {
    GET: '#22C55E', POST: '#3B82F6', PUT: '#F97316',
    DELETE: '#EF4444', PATCH: '#A855F7',
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-muted/20 flex-shrink-0">
        <Terminal size={13} className="text-primary" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Decoy Interaction Log
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground font-mono">{items.length} events</span>
      </div>
      <div className="flex-1 overflow-y-auto font-mono text-[11px] p-3 space-y-1 bg-black/20">
        {loading && (
          <div className="text-center py-8 text-muted-foreground text-[10px]">Loading interactions…</div>
        )}
        {!loading && items.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-[10px]">
            Attacker has not yet triggered decoy interactions.
          </div>
        )}
        <AnimatePresence initial={false}>
          {items.map((item, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-start gap-2 py-1 border-b border-white/5 last:border-0">
              <span className="text-muted-foreground/50 w-14 flex-shrink-0">
                {new Date(item.ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <span className="w-14 flex-shrink-0 font-bold text-center"
                style={{ color: METHOD_COLOR[item.method] || '#6B7280' }}>
                {item.method}
              </span>
              <span className="text-cyan-400/80 flex-1 truncate" title={item.path}>{item.path}</span>
              <span className="text-[10px] px-1.5 py-0.5 bg-white/5 text-muted-foreground flex-shrink-0 max-w-[120px] truncate"
                title={item.technique}>
                {item.technique}
              </span>
              <span className="text-muted-foreground/60 font-mono flex-shrink-0"
                style={{ color: item.code >= 400 ? '#F97316' : '#22C55E' }}>
                {item.code}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

// ─── Session Detail Panel ─────────────────────────────────────────────────────

function SessionDetail({
  session, onClose
}: { session: LiveSession; onClose: () => void }) {
  const [tab, setTab] = useState<'overview' | 'tier' | 'feed'>('overview');

  // Build tier breakdown directly from the session data already returned by
  // getActiveSessions() — no separate re-evaluation fetch needed, which was
  // the cause of the "Loading analysis…" stuck state (the eval-status endpoint
  // requires auth via a raw fetch that can silently fail or return stale data).
  const breakdown: TierBreakdown | null = session.eval_tier != null ? {
    flagged:            session.backend_type === 'deceptive',
    tier:               session.eval_tier!,
    score:              session.score ?? 0,
    threat_level:       session.threat_level,
    techniques:         session.detected_techniques ?? [],
    reasons:            [],
    deception_strategy: session.deception_strategy ?? 'monitor',
    confidence:         session.score ? Math.min(Math.round(session.score * 0.9), 100) : 0,
    ai_powered:         false,
    explanation:        session.detected_techniques?.length
      ? `Detected: ${session.detected_techniques.join(', ')}.`
      : 'No specific attack techniques identified yet.',
    soft_isolation:     false,
    tier1_triggers:     [],
    tier2_breakdown:    {},
    tier3_analysis:     {},
  } : null;

  const threatCfg = THREAT[session.threat_level] || THREAT.low;
  const stratColor = STRATEGY_COLOR[breakdown?.deception_strategy || 'monitor'];

  return (
    <motion.div
      initial={{ opacity: 0, x: 32 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 32 }}
      className="flex flex-col h-full border-l border-border bg-card overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border bg-muted/30 flex-shrink-0">
        <PulsingDot color={threatCfg.color} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold font-mono text-foreground truncate">{session.domain}</p>
          <p className="text-[10px] text-muted-foreground font-mono truncate">{session.ip_address}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0 flex-shrink-0">
          <ChevronRight size={14} />
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border flex-shrink-0">
        {(['overview', 'tier', 'feed'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn(
              'flex-1 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors',
              tab === t ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-muted-foreground hover:text-foreground'
            )}>
            {t === 'overview' ? 'Overview' : t === 'tier' ? 'Tier Analysis' : 'Decoy Feed'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* ── Overview Tab ── */}
        {tab === 'overview' && (
          <div className="p-4 space-y-3">
            {/* Risk score ring */}
            <div className="flex items-center justify-center py-4">
              <div className="relative w-28 h-28">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor"
                    strokeWidth="8" className="text-border" />
                  <circle cx="50" cy="50" r="40" fill="none"
                    stroke={threatCfg.color} strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - (breakdown?.score || session.score || 0) / 100)}`}
                    className="transition-all duration-700" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black font-mono" style={{ color: threatCfg.color }}>
                    {breakdown?.score ?? session.score ?? '—'}
                  </span>
                  <span className="text-[9px] uppercase tracking-widest text-muted-foreground">risk score</span>
                </div>
              </div>
            </div>

            {/* Key facts grid */}
            <div className="grid grid-cols-2 gap-1.5">
              <StatBadge icon={Clock}     label="Duration"    value={duration(session.start_time)} />
              <StatBadge icon={Activity}  label="Requests"    value={session.interaction_count} />
              <StatBadge icon={Layers}    label="Flagged by"  value={`Tier ${breakdown?.tier ?? '—'}`}
                accent={breakdown?.tier ? TIER_COLOR[breakdown.tier] : undefined} />
              <StatBadge icon={Brain}     label="Confidence"  value={breakdown?.confidence ? `${breakdown.confidence}%` : '—'}
                accent="#A855F7" />
            </div>

            {/* Strategy */}
            {breakdown?.deception_strategy && (
              <div className="flex items-center gap-2 px-3 py-2 border border-border"
                style={{ borderColor: stratColor + '40', backgroundColor: stratColor + '10' }}>
                <FlaskConical size={13} style={{ color: stratColor }} />
                <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: stratColor }}>
                  Strategy: {breakdown.deception_strategy}
                </span>
                {breakdown.soft_isolation && (
                  <span className="ml-auto text-[9px] text-muted-foreground uppercase">Soft Isolation</span>
                )}
              </div>
            )}

            {/* AI explanation */}
            {breakdown?.explanation && (
              <div className="px-3 py-2.5 border border-primary/20 bg-primary/5">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Brain size={11} className="text-primary" />
                  <span className="text-[9px] uppercase tracking-widest font-bold text-primary">AI Analysis</span>
                  {breakdown.ai_powered && (
                    <span className="ml-auto text-[9px] text-primary/60">Groq</span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{breakdown.explanation}</p>
              </div>
            )}

            {/* Techniques */}
            {session.detected_techniques?.length > 0 && (
              <div>
                <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1.5">Detected Techniques</p>
                <div className="flex flex-wrap gap-1">
                  {session.detected_techniques.map(t => (
                    <span key={t} className="px-2 py-0.5 text-[10px] border border-border bg-muted/30 text-muted-foreground">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Tier Analysis Tab ── */}
        {tab === 'tier' && (
          <div className="p-4 space-y-3">
            {!breakdown && (
              <div className="text-center py-8 text-muted-foreground text-xs">
                <p className="font-semibold mb-1">No evaluation data yet</p>
                <p>This session hasn't been evaluated by the detection pipeline yet, or no attacks have been detected.</p>
              </div>
            )}
            {breakdown && (
              <>
                {/* Tier badge */}
                <div className="flex items-center gap-2 mb-2">
                  <TierPill tier={breakdown.tier} score={breakdown.score} />
                  <span className="text-[10px] text-muted-foreground">flagging decision</span>
                </div>

                {/* Tier 1 triggers */}
                {breakdown.tier1_triggers?.length > 0 && (
                  <div>
                    <p className="text-[9px] uppercase tracking-widest font-bold mb-2"
                      style={{ color: TIER_COLOR[1] }}>
                      Tier 1 — Wiretraps Triggered
                    </p>
                    <div className="space-y-1">
                      {breakdown.tier1_triggers.map((r, i) => (
                        <div key={i} className="flex items-start gap-2 px-2.5 py-1.5 bg-red-500/10 border border-red-500/20">
                          <AlertTriangle size={10} className="text-red-400 mt-0.5 flex-shrink-0" />
                          <span className="text-[10px] text-red-300">{r}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tier 2 breakdown */}
                {Object.keys(breakdown.tier2_breakdown || {}).length > 0 && (
                  <div>
                    <p className="text-[9px] uppercase tracking-widest font-bold mb-2"
                      style={{ color: TIER_COLOR[2] }}>
                      Tier 2 — Behavioural Score Breakdown
                    </p>
                    <div className="space-y-1">
                      {Object.entries(breakdown.tier2_breakdown).map(([k, v]) => (
                        <div key={k} className="flex items-center gap-2">
                          <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.min((v / 40) * 100, 100)}%`,
                                backgroundColor: TIER_COLOR[2],
                              }} />
                          </div>
                          <span className="text-[10px] text-muted-foreground flex-1 min-w-0 truncate">{k}</span>
                          <span className="text-[10px] font-mono font-bold flex-shrink-0"
                            style={{ color: TIER_COLOR[2] }}>+{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tier 3 AI */}
                {breakdown.tier === 3 && (
                  <div className="px-3 py-2.5 border border-purple-500/20 bg-purple-500/5">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Brain size={11} style={{ color: TIER_COLOR[3] }} />
                      <span className="text-[9px] uppercase tracking-widest font-bold"
                        style={{ color: TIER_COLOR[3] }}>
                        Tier 3 — AI Context Engine
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{breakdown.explanation}</p>
                    <p className="text-[10px] text-purple-400 mt-1">
                      Confidence: {breakdown.confidence}% · {breakdown.ai_powered ? 'Groq-powered' : 'Heuristic fallback'}
                    </p>
                  </div>
                )}

                {/* Reasons */}
                {breakdown.reasons?.length > 0 && (
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1.5">All Reasons</p>
                    <div className="space-y-0.5">
                      {breakdown.reasons.slice(0, 10).map((r, i) => (
                        <div key={i} className="text-[10px] text-muted-foreground px-2 py-1 bg-muted/20 border border-border/50">
                          {r}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Decoy Feed Tab ── */}
        {tab === 'feed' && (
          <div className="h-80">
            <DecoyFeed sessionId={session.session_id} />
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Session Row ──────────────────────────────────────────────────────────────

function SessionRow({
  session, isSelected, onSelect
}: { session: LiveSession; isSelected: boolean; onSelect: () => void }) {
  const threatCfg = THREAT[session.threat_level] || THREAT.low;
  const isFlagged     = session.backend_type === 'deceptive';
  const isDecoyActive = isFlagged && session.swap_approved;
  const isPending     = isFlagged && !session.swap_approved;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onSelect}
      className={cn(
        'flex items-center gap-3 px-4 py-3 border-b border-border cursor-pointer transition-all duration-150 select-none',
        isSelected ? 'bg-primary/8 border-l-2 border-l-primary' : 'hover:bg-muted/30',
        isDecoyActive && !isSelected && 'bg-red-500/5',
        isPending     && !isSelected && 'bg-amber-500/5',
      )}>

      {/* Status dot */}
      {isDecoyActive && threatCfg.pulse
        ? <PulsingDot color={threatCfg.color} />
        : isPending
          ? <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 animate-pulse" style={{ backgroundColor: '#F59E0B' }} />
          : <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: threatCfg.color }} />}

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-xs font-semibold font-mono text-foreground truncate">{session.domain}</p>
          {isDecoyActive && (
            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 bg-red-500/20 text-red-400 border border-red-500/30 flex-shrink-0">
              DECOY ACTIVE
            </span>
          )}
          {isPending && (
            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 bg-amber-500/20 text-amber-500 border border-amber-500/30 flex-shrink-0">
              FLAGGED
            </span>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground font-mono">{session.ip_address}</p>
      </div>

      {/* Techniques preview */}
      <div className="hidden md:flex flex-col items-end gap-0.5 flex-shrink-0 max-w-[140px]">
        {session.detected_techniques?.slice(0, 2).map(t => (
          <span key={t} className="text-[9px] text-muted-foreground truncate max-w-full">{t}</span>
        ))}
        {(session.detected_techniques?.length || 0) > 2 && (
          <span className="text-[9px] text-muted-foreground">
            +{session.detected_techniques.length - 2} more
          </span>
        )}
      </div>

      {/* Score + tier */}
      <div className="flex flex-col items-end flex-shrink-0 gap-0.5">
        <span className="text-sm font-black font-mono" style={{ color: threatCfg.color }}>
          {session.score ?? '—'}
        </span>
        {session.eval_tier && (
          <span className="text-[9px] font-bold" style={{ color: TIER_COLOR[session.eval_tier] }}>
            T{session.eval_tier}
          </span>
        )}
      </div>

      {/* Last seen */}
      <div className="flex-shrink-0 text-right hidden lg:block">
        <p className="text-[10px] text-muted-foreground">{ago(session.last_activity)}</p>
        <p className="text-[10px] text-muted-foreground">{duration(session.start_time)}</p>
      </div>

      <ChevronRight size={12} className={cn('text-muted-foreground flex-shrink-0 transition-transform', isSelected && 'rotate-180')} />
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DeceptionMonitor() {
  const [sessions, setSessions]     = useState<LiveSession[]>([]);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState<LiveSession | null>(null);
  const [filter, setFilter]         = useState<'all' | 'deceptive' | 'flagged'>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadSessions = useCallback(async () => {
    try {
      const data = await api.getActiveSessions({ limit: 100, is_active: true });
      const list: LiveSession[] = (Array.isArray(data) ? data : (data as any).results || [])
        .map((s: any) => ({
          session_id:          s.session_id,
          domain:              s.domain,
          ip_address:          s.ip_address,
          threat_level:        s.threat_level || 'low',
          backend_type:        s.backend_type || 'real',
          engagement_status:   s.engagement_status || 'learning',
          interaction_count:   s.interaction_count || 0,
          start_time:          s.start_time,
          last_activity:       s.last_activity,
          detected_techniques: s.detected_techniques || [],
          eval_tier:           s.eval_tier,
          score:               s.suspicion_score,
          deception_strategy:  s.deception_strategy,
          swap_approved:       s.swap_approved ?? false,
        }));
      setSessions(list);
      setLastUpdated(new Date());
      // Keep selected session in sync
      if (selected) {
        const updated = list.find(s => s.session_id === selected.session_id);
        if (updated) setSelected(updated);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [selected]);

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (autoRefresh) {
      pollRef.current = setInterval(loadSessions, 7000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [autoRefresh, loadSessions]);

  // Filtered list
  const displayed = sessions.filter(s => {
    if (filter === 'deceptive') return s.backend_type === 'deceptive';
    if (filter === 'flagged')   return s.threat_level === 'high' || s.threat_level === 'critical';
    return true;
  });

  // Summary counts
  const total     = sessions.length;
  const deceptiveActive = sessions.filter(s => s.backend_type === 'deceptive' && s.swap_approved).length;
  const flaggedPending  = sessions.filter(s => s.backend_type === 'deceptive' && !s.swap_approved).length;
  const critical  = sessions.filter(s => s.threat_level === 'critical').length;
  const analyzing = sessions.filter(s => s.engagement_status === 'analyzing').length;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
      <div className="flex flex-col overflow-hidden" style={{height: 'calc(100vh - 8rem)'}}>

        {/* ── Top Bar ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Eye size={20} className="text-primary" />
              {(deceptiveActive > 0 || flaggedPending > 0) && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full animate-pulse"
                  style={{ backgroundColor: deceptiveActive > 0 ? '#EF4444' : '#F59E0B' }} />
              )}
            </div>
            <div>
              <h1 className="text-base font-black uppercase tracking-widest text-foreground">
                Live Deception Monitor
              </h1>
              <p className="text-[10px] text-muted-foreground">
                Real-time view of all sessions — clean and deceptive
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Auto-refresh toggle */}
            <button
              onClick={() => setAutoRefresh(v => !v)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest border transition-colors',
                autoRefresh
                  ? 'border-primary/50 bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-border hover:text-foreground'
              )}>
              {autoRefresh ? <Wifi size={11} /> : <WifiOff size={11} />}
              {autoRefresh ? 'Live' : 'Paused'}
            </button>

            <Button variant="outline" size="sm" onClick={loadSessions}
              className="text-[10px] h-7 px-3 uppercase tracking-widest">
              <RefreshCw size={11} className="mr-1.5" />
              Refresh
            </Button>

            <span className="text-[10px] text-muted-foreground font-mono hidden md:block">
              Updated {lastUpdated.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        </div>

        {/* ── Summary Stats ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-4 border-b border-border flex-shrink-0">
          {[
            { label: 'Total Sessions',   value: total,           icon: Radio,       color: undefined   },
            { label: 'Decoy Active',     value: deceptiveActive, icon: FlaskConical, color: '#EF4444'  },
            { label: 'Pending Approval', value: flaggedPending,  icon: Crosshair,   color: '#F59E0B'   },
            { label: 'Under Analysis',   value: analyzing,       icon: Brain,       color: '#A855F7'   },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="flex items-center gap-3 px-6 py-4 border-r border-border last:border-r-0">
              <Icon size={18} style={{ color: color || 'var(--muted-foreground)' }} />
              <div>
                <p className="text-2xl font-black font-mono" style={color ? { color } : undefined}>
                  {value}
                </p>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
              </div>
              {value > 0 && color && (
                <span className="ml-auto w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: color }} />
              )}
            </div>
          ))}
        </div>

        {/* ── Body: List + Detail ──────────────────────────────────────────── */}
        <div className="flex flex-1 min-h-0">

          {/* Left: session list */}
          <div className={cn('flex flex-col border-r border-border transition-all duration-300',
            selected ? 'w-[52%]' : 'w-full')}>

            {/* Filter bar */}
            <div className="flex items-center gap-1 px-4 py-2 border-b border-border bg-muted/10 flex-shrink-0">
              {(['all', 'deceptive', 'flagged'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={cn(
                    'px-3 py-1 text-[10px] font-bold uppercase tracking-widest transition-colors',
                    filter === f ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'
                  )}>
                  {f === 'all' ? `All (${total})` : f === 'deceptive' ? `Decoy Active (${deceptiveActive})` : `Flagged (${flaggedPending + critical})`}
                </button>
              ))}
              <div className="ml-auto flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Target size={10} />
                <span>{displayed.length} shown</span>
              </div>
            </div>

            {/* Column headers */}
            <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-muted/5 flex-shrink-0">
              <span className="w-2.5 flex-shrink-0" />
              <span className="flex-1 text-[9px] uppercase tracking-widest text-muted-foreground">Domain / IP</span>
              <span className="hidden md:block w-[140px] text-[9px] uppercase tracking-widest text-muted-foreground text-right">Techniques</span>
              <span className="w-10 text-[9px] uppercase tracking-widest text-muted-foreground text-right">Score</span>
              <span className="hidden lg:block w-20 text-[9px] uppercase tracking-widest text-muted-foreground text-right">Activity</span>
              <span className="w-4" />
            </div>

            {/* Session rows */}
            <div className="flex-1 overflow-y-auto">
              {loading && (
                <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground text-sm">
                  <RefreshCw size={14} className="animate-spin" /> Loading sessions…
                </div>
              )}
              {!loading && displayed.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Shield size={32} className="mb-3 opacity-20" />
                  <p className="text-sm">No sessions match this filter</p>
                  <p className="text-xs mt-1">All clear — no active deception sessions</p>
                </div>
              )}
              <AnimatePresence>
                {displayed.map(s => (
                  <SessionRow
                    key={s.session_id}
                    session={s}
                    isSelected={selected?.session_id === s.session_id}
                    onSelect={() => setSelected(selected?.session_id === s.session_id ? null : s)}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Right: detail panel */}
          <AnimatePresence>
            {selected && (
              <div className="flex-1 min-w-0">
                <SessionDetail session={selected} onClose={() => setSelected(null)} />
              </div>
            )}
          </AnimatePresence>

        </div>
      </div>
      </div>
    </DashboardLayout>
  );
}
