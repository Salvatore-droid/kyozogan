import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import {
  Zap,
  X,
  Filter,
  Loader2,
  RefreshCw,
  Activity,
  Shield,
  AlertTriangle,
  Globe,
  Clock,
  Hash,
  ChevronRight,
  Brain,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, ActiveSession, SessionAIAnalysis } from '@/lib/api';

/* ─── Helpers ────────────────────────────────────────────────── */
const THREAT_CONFIG = {
  critical: { label: 'Critical', color: '#D32F2F', bg: '#D32F2F18', pulse: true },
  high:     { label: 'High',     color: '#F57C00', bg: '#F57C0018', pulse: true },
  medium:   { label: 'Medium',   color: '#FBC02D', bg: '#FBC02D18', pulse: false },
  low:      { label: 'Low',      color: '#388E3C', bg: '#388E3C18', pulse: false },
} as const;

const BACKEND_CONFIG = {
  deceptive_active:  { label: 'Decoy Active',     color: '#D32F2F', bg: '#D32F2F18' },
  deceptive_pending: { label: 'Flagged · Pending', color: '#F59E0B', bg: '#F59E0B15' },
  real:              { label: 'Clean',             color: '#388E3C', bg: '#388E3C18' },
} as const;

const ENGAGEMENT_CONFIG = {
  deceiving: { label: 'Deceiving', color: '#D32F2F', bg: '#D32F2F18' },
  analyzing: { label: 'Analyzing', color: '#F57C00', bg: '#F57C0018' },
  learning:  { label: 'Learning',  color: '#0D7377', bg: '#0D737718' },
} as const;

type ThreatLevel = keyof typeof THREAT_CONFIG;
type EngagementStatus = keyof typeof ENGAGEMENT_CONFIG;

const getSessionDuration = (startTime: string) => {
  const start = new Date(startTime);
  const minutes = Math.floor((Date.now() - start.getTime()) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
};

const fmtTime = (d: string) => {
  const date = new Date(d);
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

/* ─── Sub-components ─────────────────────────────────────────── */
function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="px-5 py-3.5 border-r border-border last:border-r-0">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-black font-mono mt-0.5" style={accent ? { color: accent } : undefined}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function ThreatBadge({ level }: { level: string }) {
  const cfg = THREAT_CONFIG[level as ThreatLevel] ?? THREAT_CONFIG.low;
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.pulse ? 'animate-pulse' : ''}`} style={{ backgroundColor: cfg.color }} />
      <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: cfg.color }}>{cfg.label}</span>
    </div>
  );
}

function BackendBadge({ backendType, swapApproved }: { backendType: string; swapApproved?: boolean }) {
  const cfg = backendType === 'deceptive'
    ? (swapApproved ? BACKEND_CONFIG.deceptive_active : BACKEND_CONFIG.deceptive_pending)
    : BACKEND_CONFIG.real;
  return (
    <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 border"
      style={{ color: cfg.color, borderColor: cfg.color, backgroundColor: cfg.bg }}>
      {cfg.label}
    </span>
  );
}

function EngagementBadge({ status }: { status: string }) {
  const cfg = ENGAGEMENT_CONFIG[status as EngagementStatus] ?? ENGAGEMENT_CONFIG.learning;
  return (
    <span
      className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 border inline-flex items-center gap-1.5"
      style={{ color: cfg.color, borderColor: cfg.color, backgroundColor: cfg.bg }}
    >
      <Zap size={10} />
      {cfg.label}
    </span>
  );
}

function MetaLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
      {children}
    </p>
  );
}

function InfoRow({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <MetaLabel>{label}</MetaLabel>
      <p className={`text-xs ${mono ? 'font-mono' : ''} text-foreground/80 truncate`}>{value || '—'}</p>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────── */
/* ─── AI Analysis Block ──────────────────────────────────────── */
function AIAnalysisBlock({ sessionId }: { sessionId: string }) {
  const [analysis, setAnalysis] = useState<SessionAIAnalysis | null>(null);
  const [loading, setLoading]   = useState(false);
  const [loaded, setLoaded]     = useState(false);

  const load = async () => {
    if (loaded) return;
    setLoading(true);
    try {
      const result = await api.getSessionAIAnalysis(sessionId);
      setAnalysis(result);
      setLoaded(true);
    } catch {
      // Groq key not set or network error — show a soft message
      setAnalysis({
        risk_score: 0, threat_level: 'low', flagged: false,
        techniques: [], explanation: 'AI analysis unavailable — set GROQ_API_KEY in your backend.',
        deception_strategy: 'monitor', confidence: 0, ai_powered: false,
      });
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [sessionId]);

  if (loading) return (
    <div className="flex items-center gap-2 py-2 text-[11px] text-muted-foreground">
      <Loader2 size={11} className="animate-spin" /> AI is analysing this session…
    </div>
  );

  if (!analysis) return null;

  const STRATEGY_COLOR: Record<string, string> = {
    monitor:  '#0D7377',
    lure:     '#F57C00',
    isolate:  '#E65100',
    contain:  '#D32F2F',
  };

  return (
    <div className="border border-primary/20 bg-primary/3 p-3 space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-1.5">
        <Brain size={10} /> AI Threat Analysis {!analysis.ai_powered && <span className="text-muted-foreground font-normal normal-case">(fallback)</span>}
      </p>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-0.5">Risk Score</p>
          <p className="text-lg font-black font-mono" style={{ color: analysis.risk_score > 60 ? '#D32F2F' : analysis.risk_score > 30 ? '#F57C00' : '#388E3C' }}>
            {analysis.risk_score}
          </p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-0.5">Confidence</p>
          <p className="text-lg font-black font-mono text-foreground">{analysis.confidence}%</p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-0.5">Strategy</p>
          <p className="text-[11px] font-bold uppercase" style={{ color: STRATEGY_COLOR[analysis.deception_strategy] ?? '#0D7377' }}>
            {analysis.deception_strategy}
          </p>
        </div>
      </div>

      {analysis.techniques.length > 0 && (
        <div>
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1">Detected Techniques</p>
          <div className="flex flex-wrap gap-1">
            {analysis.techniques.map((t, i) => (
              <span key={i} className="text-[10px] px-1.5 py-0.5 bg-destructive/10 border border-destructive/20 text-destructive font-semibold">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {analysis.explanation && (
        <p className="text-[11px] text-foreground/70 leading-relaxed border-t border-border/60 pt-2">
          {analysis.explanation}
        </p>
      )}
    </div>
  );
}

const ActiveSessions = () => {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [summary, setSummary] = useState<{
    total_sessions: number;
    deceptive_sessions: number;
    real_sessions: number;
    avg_interactions: number;
  } | null>(null);
  const [filters, setFilters] = useState({
    backend_type: '',
    threat_level: '',
    engagement_status: '',
  });

  useEffect(() => {
    fetchSessions();
    fetchSummary();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchSessions(true);
        fetchSummary();
      }, 10000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  useEffect(() => {
    let filtered = [...sessions];
    if (filters.backend_type) {
      filtered = filtered.filter((s) => s.backend_type === filters.backend_type);
    }
    if (filters.threat_level) {
      filtered = filtered.filter((s) => s.threat_level === filters.threat_level);
    }
    if (filters.engagement_status) {
      filtered = filtered.filter((s) => s.engagement_status === filters.engagement_status);
    }
    setFilteredSessions(filtered);
  }, [filters, sessions]);

  const fetchSessions = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      
      const data = await api.getActiveSessions({ limit: 100 });
      setSessions(data);
      setLastRefresh(new Date());
    } catch (error: any) {
      if (!silent && error.message !== 'Failed to fetch active sessions') {
        toast.error(error.message || 'Failed to load active sessions');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const data = await api.getActiveSessionsSummary();
      setSummary({
        total_sessions: data.total_sessions,
        deceptive_sessions: data.deceptive_sessions,
        real_sessions: data.real_sessions,
        avg_interactions: data.avg_interactions,
      });
    } catch {
      /* summary endpoint may not be available */
    }
  };

  const handleRefresh = async () => {
    await Promise.all([fetchSessions(true), fetchSummary()]);
    toast.success('Sessions refreshed');
  };

  const handleTerminateSession = async (id: string) => {
    if (!confirm('Terminate this session? This will disconnect the attacker immediately.')) return;
    try {
      await api.terminateSession(id);
      setSessions(sessions.filter((s) => s.id !== id));
      toast.success('Session terminated');
      fetchSummary();
    } catch (error: any) {
      toast.error(error.message || 'Failed to terminate session');
    }
  };

  const handleApproveSwap = async (id: string) => {
    try {
      const result = await api.approveSwap(id);
      setSessions(sessions.map((s) => s.id === id ? { ...s, swap_approved: true } : s));
      toast.success('Swap approved — attacker will now receive deceptive responses');
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve swap');
    }
  };

  const handleRevokeSwap = async (id: string) => {
    try {
      await api.revokeSwap(id);
      setSessions(sessions.map((s) => s.id === id ? { ...s, swap_approved: false } : s));
      toast.success('Swap revoked — session will receive real responses again');
    } catch (error: any) {
      toast.error(error.message || 'Failed to revoke swap');
    }
  };

  const hasActiveFilters = filters.backend_type || filters.threat_level || filters.engagement_status;

  if (loading && sessions.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-7 h-7 animate-spin text-primary mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Loading active sessions…</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">

        {/* ── Page header ──────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-6 pb-5 border-b border-border">
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight text-foreground">Active Sessions</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Real-time monitoring of attacker sessions and backend routing
            </p>
            {autoRefresh && (
              <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                Auto-refresh every 10s · Last: {lastRefresh.toLocaleTimeString()}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setAutoRefresh(!autoRefresh)}
              variant={autoRefresh ? 'default' : 'outline'}
              className={`h-9 px-4 text-sm font-semibold gap-2 ${
                autoRefresh
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'border-border text-foreground/70 hover:bg-muted'
              }`}
            >
              <Activity size={13} />
              {autoRefresh ? 'Auto ON' : 'Auto OFF'}
            </Button>
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              className={`h-9 px-4 text-sm font-semibold gap-2 transition-colors ${
                showFilters || hasActiveFilters
                  ? 'bg-primary/10 border-primary/50 text-primary hover:bg-primary/20'
                  : 'border-border text-foreground/70 hover:bg-muted'
              }`}
            >
              <Filter size={13} />
              Filters
              {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
            </Button>
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              variant="outline"
              className="border-border text-foreground/70 hover:bg-muted h-9 px-4 text-sm font-semibold gap-2"
            >
              {refreshing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              Refresh
            </Button>
          </div>
        </div>

        {/* ── Summary strip ────────────────────────────────────── */}
        {summary && (
          <div className="grid grid-cols-4 border border-border mb-6">
            <StatCard label="Total Active" value={summary.total_sessions} accent="hsl(var(--primary))" />
            <StatCard
              label="Deceptive Backend"
              value={summary.deceptive_sessions}
              accent={BACKEND_CONFIG.deceptive_active.color}
            />
            <StatCard
              label="Real Backend"
              value={summary.real_sessions}
              accent={BACKEND_CONFIG.real.color}
            />
            <StatCard
              label="Avg Interactions"
              value={summary.avg_interactions}
              accent="#FBC02D"
            />
          </div>
        )}

        {/* ── Filter panel ─────────────────────────────────────── */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="border border-primary/50 bg-card mb-6 overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-primary/5">
                <span className="text-xs font-bold uppercase tracking-widest text-primary">Filter Sessions</span>
                <button
                  onClick={() => setShowFilters(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X size={15} />
                </button>
              </div>
              <div className="px-5 py-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
                      Backend Type
                    </label>
                    <select
                      value={filters.backend_type}
                      onChange={(e) => setFilters({ ...filters, backend_type: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary h-9"
                    >
                      <option value="">All Types</option>
                      <option value="real">Real</option>
                      <option value="deceptive">Deceptive</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
                      Threat Level
                    </label>
                    <select
                      value={filters.threat_level}
                      onChange={(e) => setFilters({ ...filters, threat_level: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary h-9"
                    >
                      <option value="">All Levels</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
                      Engagement Status
                    </label>
                    <select
                      value={filters.engagement_status}
                      onChange={(e) => setFilters({ ...filters, engagement_status: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary h-9"
                    >
                      <option value="">All Statuses</option>
                      <option value="learning">Learning</option>
                      <option value="deceiving">Deceiving</option>
                      <option value="analyzing">Analyzing</option>
                    </select>
                  </div>
                </div>
                {hasActiveFilters && (
                  <Button
                    onClick={() => setFilters({ backend_type: '', threat_level: '', engagement_status: '' })}
                    variant="outline"
                    className="border-border text-foreground/70 hover:bg-muted h-9 px-5 text-sm font-semibold"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Empty state ──────────────────────────────────────── */}
        {filteredSessions.length === 0 ? (
          <div className="border border-border bg-card py-20 text-center">
            <Shield size={32} className="mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-sm font-semibold text-foreground mb-1">No active sessions</p>
            <p className="text-xs text-muted-foreground">
              {hasActiveFilters ? 'Try adjusting your filters' : 'All sessions are currently idle'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {filteredSessions.map((session, idx) => {
                const isExpanded = expandedId === session.id;
                const threatCfg = THREAT_CONFIG[session.threat_level as ThreatLevel] ?? THREAT_CONFIG.low;
                const isCriticalDeceptive = session.backend_type === 'deceptive' && session.threat_level === 'critical';
                const isSwapPending = session.backend_type === 'deceptive' && !session.swap_approved;

                return (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ delay: Math.min(idx * 0.03, 0.3), duration: 0.2 }}
                    className={`border bg-card overflow-hidden transition-all ${
                      isExpanded ? 'border-primary/50' : 'border-border hover:border-muted-foreground/30'
                    }`}
                  >
                    {/* Collapsed view */}
                    <div
                      className="px-4 py-3 cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : session.id)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 flex-wrap">
                            <ThreatBadge level={session.threat_level} />
                            <BackendBadge backendType={session.backend_type} swapApproved={session.swap_approved} />
                            <EngagementBadge status={session.engagement_status} />
                          </div>
                          <div className="flex items-center gap-3 mt-2">
                            <Globe size={12} className="text-muted-foreground/50 flex-shrink-0" />
                            <span className="text-sm font-bold text-foreground truncate">{session.domain}</span>
                          </div>
                          <div className="flex items-center gap-4 mt-1.5 text-[10px] font-mono text-muted-foreground">
                            <span>{session.ip_address}</span>
                            <span>·</span>
                            <span>Duration: {getSessionDuration(session.start_time)}</span>
                            <span>·</span>
                            <span>Interactions: {session.interaction_count}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {/* Swap gate controls — only visible for flagged sessions */}
                          {session.backend_type === 'deceptive' && !session.swap_approved && (
                            <Button
                              onClick={(e) => { e.stopPropagation(); handleApproveSwap(session.id); }}
                              variant="outline"
                              className="h-7 px-2 text-xs border-amber-500/60 text-amber-600 hover:bg-amber-500/10 font-semibold"
                              title="Session is flagged. Review AI analysis then approve to start serving deceptive responses."
                            >
                              <Shield size={12} className="mr-1" />
                              Approve Swap
                            </Button>
                          )}
                          {session.backend_type === 'deceptive' && session.swap_approved && (
                            <Button
                              onClick={(e) => { e.stopPropagation(); handleRevokeSwap(session.id); }}
                              variant="outline"
                              className="h-7 px-2 text-xs border-emerald-500/60 text-emerald-600 hover:bg-emerald-500/10 font-semibold"
                            >
                              <Eye size={12} className="mr-1" />
                              Revoking
                            </Button>
                          )}
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTerminateSession(session.id);
                            }}
                            variant="outline"
                            className="h-7 px-2 text-xs border-destructive/50 text-destructive hover:bg-destructive/10 font-semibold"
                          >
                            <X size={12} className="mr-1" />
                            Terminate
                          </Button>
                          {!isExpanded && (
                            <ChevronRight size={14} className="text-muted-foreground/50" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="border-t border-border/60 overflow-hidden"
                        >
                          <div className="px-4 py-4 space-y-4">
                            {/* Meta grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <InfoRow label="Session ID" value={session.session_id} />
                              <InfoRow label="IP Address" value={session.ip_address} />
                              <InfoRow label="Start Time" value={fmtTime(session.start_time)} />
                              <InfoRow label="Duration" value={getSessionDuration(session.start_time)} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <InfoRow label="Interaction Count" value={String(session.interaction_count)} mono={false} />
                              <InfoRow
                                label="Swap Status"
                                value={session.backend_type === 'deceptive'
                                  ? (session.swap_approved ? 'Decoy Active' : 'Flagged — Pending Approval')
                                  : 'Clean'}
                                mono={false}
                              />
                            </div>

                            {/* Detected techniques */}
                            {session.detected_techniques && session.detected_techniques.length > 0 && (
                              <div>
                                <MetaLabel>Detected Techniques</MetaLabel>
                                <div className="flex flex-wrap gap-1.5 mt-1">
                                  {session.detected_techniques.map((technique) => (
                                    <span key={technique} className="text-[10px] font-mono px-2 py-0.5 bg-muted border border-border text-foreground/70">
                                      {technique}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Pending approval alert — prompt the operator to act */}
                            {isSwapPending && (
                              <div className="bg-amber-500/10 border-l-2 border-amber-500 p-3">
                                <p className="text-xs font-semibold text-amber-600 flex items-center gap-2">
                                  <AlertTriangle size={12} />
                                  Swap Pending Your Approval
                                </p>
                                <p className="text-xs text-amber-600/80 mt-1">
                                  This session has been flagged as malicious. Review the AI analysis below, then click <strong>Approve Swap</strong> to start serving deceptive responses. Until you approve, the attacker is still receiving real responses.
                                </p>
                              </div>
                            )}

                            {/* Active decoy confirmation */}
                            {isCriticalDeceptive && session.swap_approved && (
                              <div className="bg-destructive/10 border-l-2 border-destructive p-3">
                                <p className="text-xs font-semibold text-destructive flex items-center gap-2">
                                  <AlertTriangle size={12} />
                                  Decoy Active — Critical Threat
                                </p>
                                <p className="text-xs text-destructive/80 mt-1">
                                  Operator-approved swap is active. Attacker is being served deceptive responses.
                                </p>
                              </div>
                            )}

                            {/* AI Analysis */}
                            <AIAnalysisBlock sessionId={session.id} />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ActiveSessions;