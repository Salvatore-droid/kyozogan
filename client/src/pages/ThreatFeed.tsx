import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import {
  RefreshCw,
  Filter,
  Share2,
  CheckCircle,
  Loader2,
  Activity,
  Shield,
  Target,
  Globe,
  X,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, ThreatIntelligence, ThreatIntelligenceStats } from '@/lib/api';

/* ─── Helpers ────────────────────────────────────────────────── */
const STATUS_CONFIG = {
  new:             { label: 'New',             color: '#0D7377', bg: '#0D737718' },
  analyzed:        { label: 'Analyzed',        color: '#F57C00', bg: '#F57C0018' },
  mitigated:       { label: 'Mitigated',       color: '#388E3C', bg: '#388E3C18' },
  false_positive:  { label: 'False Positive',  color: '#90A4AE', bg: '#90A4AE18' },
} as const;

const SOURCE_ICONS: Record<string, React.ElementType> = {
  honeypot: Target,
  deceptive_backend: Shield,
  community_sharing: Globe,
  internal_scan: Activity,
  threat_intel_feed: Globe,
};

const SOURCE_LABELS: Record<string, string> = {
  honeypot: 'Honeypot',
  deceptive_backend: 'Deceptive Backend',
  community_sharing: 'Community Sharing',
  internal_scan: 'Internal Scan',
  threat_intel_feed: 'Threat Intel Feed',
};

type Status = keyof typeof STATUS_CONFIG;

const getRiskColor = (score: number): string => {
  if (score > 75) return '#D32F2F';
  if (score > 50) return '#F57C00';
  if (score > 25) return '#FBC02D';
  return '#0D7377';
};

const getRiskLabel = (score: number): string => {
  if (score > 75) return 'Critical';
  if (score > 50) return 'High';
  if (score > 25) return 'Medium';
  return 'Low';
};

const fmtDate = (d: string) => {
  const date = new Date(d);
  return (
    date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' · ' +
    date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  );
};

/* ─── Sub-components ─────────────────────────────────────────── */
function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="px-5 py-3.5 border-r border-border last:border-r-0">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
      <p
        className="text-2xl font-black font-mono mt-0.5"
        style={accent ? { color: accent } : undefined}
      >
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as Status] ?? STATUS_CONFIG.new;
  return (
    <span
      className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 border"
      style={{ color: cfg.color, borderColor: cfg.color, backgroundColor: cfg.bg }}
    >
      {cfg.label}
    </span>
  );
}

function SourceBadge({ source }: { source: string }) {
  const Icon = SOURCE_ICONS[source] || Activity;
  const label = SOURCE_LABELS[source] || source.replace(/_/g, ' ');
  return (
    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-muted border border-border rounded">
      <Icon size={10} className="text-muted-foreground" />
      <span className="text-[10px] font-medium capitalize">{label}</span>
    </div>
  );
}

function RiskBadge({ score }: { score: number }) {
  const color = getRiskColor(score);
  const label = getRiskLabel(score);
  return (
    <span
      className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 border"
      style={{ color, borderColor: color, backgroundColor: `${color}15` }}
    >
      {label} Risk
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

/* ─── Main Component ─────────────────────────────────────────── */
const ThreatFeed = () => {
  const [threats, setThreats] = useState<ThreatIntelligence[]>([]);
  const [filteredThreats, setFilteredThreats] = useState<ThreatIntelligence[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<ThreatIntelligenceStats | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    source: '',
    status: '',
    min_risk: '',
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchThreats(true);
        fetchStats();
      }, 30000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  useEffect(() => {
    let filtered = [...threats];

    if (filters.source) {
      filtered = filtered.filter((t) => t.source === filters.source);
    }

    if (filters.status) {
      filtered = filtered.filter((t) => t.status === filters.status);
    }

    if (filters.min_risk) {
      filtered = filtered.filter((t) => t.risk_score >= parseInt(filters.min_risk));
    }

    setFilteredThreats(filtered);
  }, [filters, threats]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [threatsData, statsData] = await Promise.all([
        api.getThreatIntelligence({ limit: 100 }),
        api.getThreatIntelligenceStats(),
      ]);
      setThreats(threatsData);
      setStats(statsData);
      setLastRefresh(new Date());
    } catch (error: any) {
      toast.error(error.message || 'Failed to load threat intelligence');
    } finally {
      setLoading(false);
    }
  };

  const fetchThreats = async (silent: boolean = false) => {
    if (!silent) setRefreshing(true);
    try {
      const data = await api.getThreatIntelligence({ limit: 100 });
      setThreats(data);
      setLastRefresh(new Date());
    } catch (error: any) {
      if (!silent) toast.error(error.message || 'Failed to refresh');
    } finally {
      if (!silent) setRefreshing(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await api.getThreatIntelligenceStats();
      setStats(data);
    } catch {
      /* stats endpoint may not be available */
    }
  };

  const handleRefresh = async () => {
    await Promise.all([fetchThreats(false), fetchStats()]);
    toast.success('Threat feed refreshed');
  };

  const handleUpdateStatus = async (intelId: string, newStatus: string) => {
    try {
      const updated = await api.updateThreatIntelligence(intelId, { status: newStatus as any });
      setThreats(threats.map((t) => (t.id === updated.id ? updated : t)));
      toast.success(`Status updated to ${newStatus}`);
      fetchStats();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status');
    }
  };

  const handleShare = async (intelId: string) => {
    const shareTo = prompt('Enter the URL of the instance to share with:');
    if (shareTo) {
      try {
        await api.shareThreatIntelligence(intelId, shareTo);
        toast.success('Threat intelligence shared');
        fetchThreats(true);
      } catch (error: any) {
        toast.error(error.message || 'Failed to share');
      }
    }
  };

  const hasActiveFilters = filters.source || filters.status || filters.min_risk;

  if (loading && threats.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-7 h-7 animate-spin text-primary mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Loading threat intelligence…</p>
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
            <h1 className="text-xl font-black uppercase tracking-tight text-foreground">Threat Intelligence Feed</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Real-time analysis of detected threats, attack techniques, and malicious payloads
            </p>
            {autoRefresh && (
              <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                Auto-refresh every 30s · Last: {lastRefresh.toLocaleTimeString()}
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
        {stats && (
          <div className="grid grid-cols-4 border border-border mb-6">
            <StatCard label="Total Threats" value={stats.total_entries} accent="hsl(var(--primary))" />
            <StatCard
              label="Avg Risk Score"
              value={stats.avg_risk_score}
              accent={getRiskColor(stats.avg_risk_score)}
            />
            <StatCard
              label="High Risk"
              value={stats.high_risk_count}
              accent="#D32F2F"
            />
            <StatCard
              label="Sources Active"
              value={stats.source_stats.length}
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
                <span className="text-xs font-bold uppercase tracking-widest text-primary">Filter Threats</span>
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
                      Source
                    </label>
                    <select
                      value={filters.source}
                      onChange={(e) => setFilters({ ...filters, source: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary h-9"
                    >
                      <option value="">All Sources</option>
                      {Object.entries(SOURCE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
                      Status
                    </label>
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary h-9"
                    >
                      <option value="">All Statuses</option>
                      {Object.entries(STATUS_CONFIG).map(([value, cfg]) => (
                        <option key={value} value={value}>{cfg.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
                      Min Risk Score
                    </label>
                    <select
                      value={filters.min_risk}
                      onChange={(e) => setFilters({ ...filters, min_risk: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary h-9"
                    >
                      <option value="">Any Risk</option>
                      <option value="70">High Risk (70+)</option>
                      <option value="50">Medium Risk (50+)</option>
                      <option value="25">Low Risk (25+)</option>
                    </select>
                  </div>
                </div>
                {hasActiveFilters && (
                  <Button
                    onClick={() => setFilters({ source: '', status: '', min_risk: '' })}
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

        {/* ── Threat feed list ─────────────────────────────────── */}
        {filteredThreats.length === 0 ? (
          <div className="border border-border bg-card py-20 text-center">
            <Shield size={32} className="mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-sm font-semibold text-foreground mb-1">No threat intelligence available</p>
            <p className="text-xs text-muted-foreground">
              {hasActiveFilters ? 'Try adjusting your filters' : 'Threats will appear here as they are detected'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {filteredThreats.map((threat, idx) => {
                const isExpanded = expandedId === threat.id;
                const riskColor = getRiskColor(threat.risk_score);
                const riskLabel = getRiskLabel(threat.risk_score);

                return (
                  <motion.div
                    key={threat.id}
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
                      onClick={() => setExpandedId(isExpanded ? null : threat.id)}
                    >
                      <div className="flex items-start gap-4">
                        {/* Risk score circle */}
                        <div className="flex-shrink-0 w-14 text-center">
                          <div
                            className="w-12 h-12 rounded-full flex flex-col items-center justify-center mx-auto"
                            style={{
                              backgroundColor: `${riskColor}15`,
                              border: `1px solid ${riskColor}`,
                            }}
                          >
                            <span className="text-sm font-black font-mono" style={{ color: riskColor }}>
                              {threat.risk_score}
                            </span>
                            <span className="text-[8px] font-bold uppercase tracking-tight" style={{ color: riskColor }}>
                              risk
                            </span>
                          </div>
                        </div>

                        {/* Main content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div>
                              <p className="text-[11px] font-mono text-muted-foreground">{fmtDate(threat.timestamp)}</p>
                              <p className="text-sm font-bold text-foreground mt-0.5">{threat.description}</p>
                            </div>
                            <span className="text-[10px] font-mono text-muted-foreground flex-shrink-0">
                              {threat.id.slice(0, 8)}…
                            </span>
                          </div>

                          {/* Badge row */}
                          <div className="flex items-center gap-2 flex-wrap mt-2">
                            <SourceBadge source={threat.source} />
                            <StatusBadge status={threat.status} />
                            <RiskBadge score={threat.risk_score} />
                            {threat.technique && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 border border-primary/50 text-primary">
                                {threat.technique}
                              </span>
                            )}
                            {!isExpanded && (
                              <span className="ml-auto text-muted-foreground/50">
                                <ChevronRight size={14} />
                              </span>
                            )}
                          </div>
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
                            {/* Payload */}
                            {threat.payload && (
                              <div>
                                <MetaLabel>Payload</MetaLabel>
                                <pre className="text-[11px] font-mono bg-muted p-3 border border-border overflow-x-auto whitespace-pre-wrap break-all">
                                  {threat.payload}
                                </pre>
                              </div>
                            )}

                            {/* Tool signature */}
                            {threat.tool_signature && (
                              <div>
                                <MetaLabel>Tool Signature</MetaLabel>
                                <pre className="text-[11px] font-mono bg-muted p-3 border border-border overflow-x-auto">
                                  {threat.tool_signature}
                                </pre>
                              </div>
                            )}

                            {/* Indicators */}
                            {threat.indicators && threat.indicators.length > 0 && (
                              <div>
                                <MetaLabel>Indicators</MetaLabel>
                                <div className="flex flex-wrap gap-1.5">
                                  {threat.indicators.map((indicator, i) => (
                                    <span
                                      key={i}
                                      className="text-[10px] font-mono px-2 py-0.5 bg-muted border border-border text-foreground/70"
                                    >
                                      {indicator}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* MITRE ATT&CK */}
                            {threat.mitre_attack_id && (
                              <div>
                                <MetaLabel>MITRE ATT&amp;CK ID</MetaLabel>
                                <code className="text-[11px] font-mono text-primary bg-primary/10 px-2 py-1 border border-primary/30">
                                  {threat.mitre_attack_id}
                                </code>
                              </div>
                            )}

                            {/* Affected site */}
                            {threat.affected_site_domain && (
                              <InfoRow label="Affected Site" value={threat.affected_site_domain} mono={false} />
                            )}

                            {/* Risk analysis bar */}
                            <div>
                              <MetaLabel>Risk Analysis</MetaLabel>
                              <div className="flex items-center gap-3">
                                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                  <motion.div
                                    className="h-full rounded-full"
                                    style={{ backgroundColor: riskColor }}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${threat.risk_score}%` }}
                                    transition={{ duration: 0.4 }}
                                  />
                                </div>
                                <span className="text-xs font-mono font-bold" style={{ color: riskColor }}>
                                  {threat.risk_score}%
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-2">
                                {threat.risk_score > 75 && '⚠️ Critical threat — Immediate action required'}
                                {threat.risk_score > 50 && threat.risk_score <= 75 && '⚠️ High risk — Investigate and respond'}
                                {threat.risk_score <= 50 && '📊 Medium risk — Monitor for further activity'}
                              </p>
                            </div>

                            {/* Action buttons */}
                            <div className="flex gap-2 pt-2">
                              {threat.status === 'new' && (
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateStatus(threat.id, 'analyzed');
                                  }}
                                  className="h-8 px-3 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
                                >
                                  <CheckCircle size={12} className="mr-1.5" />
                                  Mark Analyzed
                                </Button>
                              )}
                              {threat.status === 'analyzed' && (
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateStatus(threat.id, 'mitigated');
                                  }}
                                  className="h-8 px-3 text-xs font-semibold bg-green-600 text-white hover:bg-green-700"
                                >
                                  <CheckCircle size={12} className="mr-1.5" />
                                  Mark Mitigated
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleShare(threat.id);
                                }}
                                className="h-8 px-3 text-xs font-semibold border-primary/50 text-primary hover:bg-primary/10"
                              >
                                <Share2 size={12} className="mr-1.5" />
                                Share
                              </Button>
                            </div>
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

// Helper component for the expanded view
function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">{label}</p>
      <p className={`text-xs ${mono ? 'font-mono' : ''} text-foreground/80`}>{value || '—'}</p>
    </div>
  );
}

export default ThreatFeed;