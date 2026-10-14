import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '@/components/DashboardLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2, RefreshCw, AlertTriangle, Activity, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { api, ActivityLog } from '@/lib/api';

/* ─── Helpers ────────────────────────────────────────────────── */
const RISK_CONFIG = {
  critical: { label: 'Critical', color: '#D32F2F', bg: '#D32F2F18' },
  high:     { label: 'High',     color: '#F57C00', bg: '#F57C0018' },
  medium:   { label: 'Medium',   color: '#FBC02D', bg: '#FBC02D18' },
  low:      { label: 'Low',      color: '#388E3C', bg: '#388E3C18' },
} as const;

type RiskLevel = keyof typeof RISK_CONFIG;

const getRiskLevel = (score: number): RiskLevel => {
  if (score > 80) return 'critical';
  if (score > 50) return 'high';
  if (score > 25) return 'medium';
  return 'low';
};

const fmt = (d: string) => {
  const date = new Date(d);
  return (
    date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' · ' +
    date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  );
};

/* ─── Sub-components ─────────────────────────────────────────── */
function MetaLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">
      {children}
    </p>
  );
}

function RiskBadge({ score }: { score: number }) {
  const level = getRiskLevel(score);
  const cfg   = RISK_CONFIG[level];
  return (
    <span
      className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 border flex-shrink-0"
      style={{ color: cfg.color, borderColor: cfg.color, backgroundColor: cfg.bg }}
    >
      {cfg.label}
    </span>
  );
}

function ScoreBox({ score }: { score: number }) {
  const cfg = RISK_CONFIG[getRiskLevel(score)];
  return (
    <div
      className="w-12 h-12 flex flex-col items-center justify-center border flex-shrink-0"
      style={{ color: cfg.color, borderColor: cfg.color, backgroundColor: cfg.bg }}
    >
      <span className="text-base font-black font-mono leading-none">{score}</span>
      <span className="text-[9px] font-bold uppercase tracking-widest opacity-70 mt-0.5">%</span>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────── */
const ActivityLogs = () => {
  const [logs, setLogs]                 = useState<ActivityLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading]           = useState(true);
  const [searchTerm, setSearchTerm]     = useState('');
  const [expandedId, setExpandedId]     = useState<string | null>(null);
  const [showFlaggedOnly, setShowFlaggedOnly] = useState(false);
  const [summary, setSummary] = useState<{
    total_logs: number;
    flagged_logs: number;
    avg_suspicion_score: number;
  } | null>(null);

  useEffect(() => { fetchLogs(); fetchSummary(); }, []);

  useEffect(() => {
    let filtered = logs;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.domain.toLowerCase().includes(q) ||
          log.ip_address.includes(q) ||
          log.session_id.includes(q) ||
          log.endpoint.toLowerCase().includes(q),
      );
    }
    if (showFlaggedOnly) filtered = filtered.filter((log) => log.flagged);
    setFilteredLogs(filtered);
  }, [searchTerm, logs, showFlaggedOnly]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setLogs(await api.getActivityLogs({ limit: 100 }));
    } catch (error: any) {
      toast.error(error.message || 'Failed to load activity logs');
    } finally { setLoading(false); }
  };

  const fetchSummary = async () => {
    try {
      const data = await api.getActivityLogsSummary();
      setSummary({
        total_logs:           data.total_logs,
        flagged_logs:         data.flagged_logs,
        avg_suspicion_score:  data.avg_suspicion_score,
      });
    } catch { /* summary unavailable */ }
  };

  const handleRefresh = () => {
    fetchLogs();
    fetchSummary();
    toast.success('Logs refreshed');
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-7 h-7 animate-spin text-primary mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Loading activity logs…</p>
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
            <h1 className="text-xl font-black uppercase tracking-tight text-foreground">Activity Monitoring</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Real-time threat scoring and session analysis across registered sites
            </p>
          </div>
          <Button
            onClick={handleRefresh}
            variant="outline"
            className="border-border text-foreground/70 hover:bg-muted font-bold h-9 px-4 text-sm flex items-center gap-2"
          >
            <RefreshCw size={14} />
            Refresh
          </Button>
        </div>

        {/* ── Summary strip ────────────────────────────────────── */}
        {summary && (
          <div className="grid grid-cols-3 border border-border mb-6">
            {[
              { label: 'Total Activities',   value: summary.total_logs,          accent: undefined },
              { label: 'Flagged Sessions',   value: summary.flagged_logs,         accent: 'hsl(var(--destructive))' },
              { label: 'Avg Suspicion',      value: `${summary.avg_suspicion_score}%`, accent: RISK_CONFIG[getRiskLevel(summary.avg_suspicion_score)].color },
            ].map((stat, i) => (
              <div key={i} className={`px-5 py-3.5 ${i < 2 ? 'border-r border-border' : ''}`}>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{stat.label}</p>
                <p
                  className="text-2xl font-black font-mono text-foreground mt-0.5"
                  style={stat.accent ? { color: stat.accent } : undefined}
                >
                  {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* ── Search & filter bar ──────────────────────────────── */}
        <div className="flex gap-3 mb-5">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by domain, IP, session ID or endpoint…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-background border-border text-foreground h-9 text-sm"
            />
          </div>
          <Button
            onClick={() => setShowFlaggedOnly(!showFlaggedOnly)}
            variant="outline"
            className={`font-bold h-9 px-4 text-sm flex items-center gap-2 border transition-colors ${
              showFlaggedOnly
                ? 'bg-destructive/10 border-destructive/50 text-destructive hover:bg-destructive/20'
                : 'border-border text-foreground/70 hover:bg-muted'
            }`}
          >
            <AlertTriangle size={13} />
            Flagged Only
          </Button>
        </div>

        {/* ── Empty state ──────────────────────────────────────── */}
        {filteredLogs.length === 0 ? (
          <div className="border border-border bg-card py-20 text-center">
            <Activity size={32} className="mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-sm font-semibold text-foreground mb-1">No activity logs found</p>
            <p className="text-xs text-muted-foreground">
              {searchTerm || showFlaggedOnly ? 'Try adjusting your filters' : 'Activity will appear here once sessions are monitored'}
            </p>
          </div>
        ) : (
          <div className="space-y-px border border-border bg-border">
            <AnimatePresence initial={false}>
              {filteredLogs.map((log, idx) => {
                const isExpanded = expandedId === log.id;
                const riskCfg   = RISK_CONFIG[getRiskLevel(log.suspicion_score)];

                return (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                    className="bg-card"
                  >
                    {/* ── Main row ─────────────────────────────── */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : log.id)}
                      className="w-full text-left px-4 py-3 flex items-center gap-4 hover:bg-muted/40 transition-colors"
                    >
                      {/* Score box */}
                      <ScoreBox score={log.suspicion_score} />

                      {/* Primary info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-sm font-bold text-foreground">{log.domain}</span>
                          {log.flagged && (
                            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 border border-destructive/50 text-destructive bg-destructive/10 flex-shrink-0">
                              Flagged
                            </span>
                          )}
                          <RiskBadge score={log.suspicion_score} />
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-[11px] font-mono text-muted-foreground">{fmt(log.timestamp)}</span>
                          <span className="text-muted-foreground/30 text-xs">·</span>
                          <span className="text-[11px] font-mono text-muted-foreground">{log.ip_address}</span>
                          <span className="text-muted-foreground/30 text-xs">·</span>
                          <span
                            className="text-[11px] font-mono px-1.5 py-px bg-muted text-foreground/70"
                          >
                            {log.method} {log.endpoint}
                          </span>
                          <span
                            className="text-[11px] font-mono font-bold"
                            style={{
                              color: log.status_code === 200
                                ? RISK_CONFIG.low.color
                                : RISK_CONFIG.high.color,
                            }}
                          >
                            {log.status_code}
                          </span>
                          <span className="text-[11px] font-mono text-muted-foreground">{log.response_time}ms</span>
                        </div>
                      </div>

                      {/* Expand toggle */}
                      <div className="text-muted-foreground/50 flex-shrink-0">
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </div>
                    </button>

                    {/* ── Expanded details ─────────────────────── */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-border mx-4" />
                          <div className="px-4 py-4 space-y-4">

                            {/* Meta grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div>
                                <MetaLabel>Session ID</MetaLabel>
                                <p className="text-[11px] font-mono text-foreground/70 break-all">{log.session_id}</p>
                              </div>
                              <div>
                                <MetaLabel>Response Time</MetaLabel>
                                <p className="text-[11px] font-mono text-foreground/70">{log.response_time}ms</p>
                              </div>
                              <div className="md:col-span-2">
                                <MetaLabel>User Agent</MetaLabel>
                                <p className="text-[11px] font-mono text-foreground/70 break-all leading-relaxed">{log.user_agent}</p>
                              </div>
                            </div>

                            {/* Suspicion bar */}
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <MetaLabel>Suspicion Score</MetaLabel>
                                <span
                                  className="text-[11px] font-black font-mono"
                                  style={{ color: riskCfg.color }}
                                >
                                  {log.suspicion_score}%
                                </span>
                              </div>
                              <div className="h-1.5 bg-muted w-full overflow-hidden">
                                <motion.div
                                  className="h-full"
                                  style={{ backgroundColor: riskCfg.color }}
                                  initial={{ width: 0 }}
                                  animate={{ width: `${log.suspicion_score}%` }}
                                  transition={{ duration: 0.5, ease: 'easeOut' }}
                                />
                              </div>
                              <p className="text-[11px] text-muted-foreground mt-1.5">
                                {log.suspicion_score > 80 && 'Critical threat detected — immediate action recommended'}
                                {log.suspicion_score > 50 && log.suspicion_score <= 80 && 'High-risk activity — monitor closely'}
                                {log.suspicion_score > 25 && log.suspicion_score <= 50 && 'Medium risk — further investigation warranted'}
                                {log.suspicion_score <= 25 && 'Low risk — normal activity pattern'}
                              </p>
                            </div>

                            {/* Flagged notice */}
                            {log.flagged && (
                              <div
                                className="px-4 py-3 border text-xs font-semibold"
                                style={{
                                  color: RISK_CONFIG.critical.color,
                                  borderColor: `${RISK_CONFIG.critical.color}50`,
                                  backgroundColor: RISK_CONFIG.critical.bg,
                                }}
                              >
                                ⚠ This session has been flagged as malicious. Go to <strong>Active Sessions</strong> to review the AI threat analysis and approve the deceptive backend swap.
                              </div>
                            )}

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

export default ActivityLogs;