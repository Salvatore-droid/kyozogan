import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Filter,
  Loader2,
  RefreshCw,
  Shield,
  X,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, Threat } from '@/lib/api';

/* ─── Helpers ────────────────────────────────────────────────── */
const SEVERITY_CONFIG = {
  critical: { label: 'Critical', color: '#D32F2F', bg: '#D32F2F18' },
  high:     { label: 'High',     color: '#F57C00', bg: '#F57C0018' },
  medium:   { label: 'Medium',   color: '#FBC02D', bg: '#FBC02D18' },
  low:      { label: 'Low',      color: '#388E3C', bg: '#388E3C18' },
} as const;

const STATUS_CONFIG = {
  active:    { label: 'Active',     color: '#D32F2F', bg: '#D32F2F18', pulse: true },
  contained: { label: 'Contained',  color: '#FBC02D', bg: '#FBC02D18', pulse: false },
  resolved:  { label: 'Resolved',   color: '#388E3C', bg: '#388E3C18', pulse: false },
} as const;

type Severity = keyof typeof SEVERITY_CONFIG;
type Status   = keyof typeof STATUS_CONFIG;

const fmt = (d: string) => {
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

function SeverityPill({ severity }: { severity: string }) {
  const cfg = SEVERITY_CONFIG[severity as Severity] ?? SEVERITY_CONFIG.low;
  return (
    <span
      className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 border flex-shrink-0"
      style={{ color: cfg.color, borderColor: cfg.color, backgroundColor: cfg.bg }}
    >
      {cfg.label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as Status] ?? STATUS_CONFIG.resolved;
  return (
    <div className="flex items-center gap-1.5">
      <div
        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.pulse ? 'animate-pulse' : ''}`}
        style={{ backgroundColor: cfg.color }}
      />
      <span
        className="text-[10px] font-bold uppercase tracking-widest"
        style={{ color: cfg.color }}
      >
        {cfg.label}
      </span>
    </div>
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
      <p className={`text-[11px] ${mono ? 'font-mono' : ''} text-foreground/80 truncate`}>{value}</p>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────── */
const ThreatDetection = () => {
  const [threats, setThreats] = useState<Threat[]>([]);
  const [filteredThreats, setFilteredThreats] = useState<Threat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filters, setFilters] = useState({ severity: '', status: '' });
  const [summary, setSummary] = useState<{
    total_threats: number;
    active_threats: number;
    contained_threats: number;
    resolved_threats: number;
  } | null>(null);

  useEffect(() => {
    fetchThreats();
    fetchSummary();
  }, []);

  useEffect(() => {
    let filtered = [...threats];
    if (filters.severity) filtered = filtered.filter((t) => t.severity === filters.severity);
    if (filters.status) filtered = filtered.filter((t) => t.status === filters.status);
    setFilteredThreats(filtered);
  }, [filters, threats]);

  const fetchThreats = async () => {
    try {
      setLoading(true);
      const data = await api.getThreats({ limit: 100 });
      setThreats(data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load threats');
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const data = await api.getThreatsSummary();
      setSummary({
        total_threats: data.total_threats,
        active_threats: data.active_threats,
        contained_threats: data.contained_threats,
        resolved_threats: data.resolved_threats,
      });
    } catch {
      /* summary endpoint may not be available */
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchThreats(), fetchSummary()]);
      toast.success('Threats refreshed');
    } catch (error: any) {
      toast.error(error.message || 'Failed to refresh');
    } finally {
      setRefreshing(false);
    }
  };

  const handleUpdateStatus = async (threatId: string, newStatus: string) => {
    try {
      const updated = await api.updateThreatStatus(threatId, newStatus);
      setThreats((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      toast.success(`Status updated to ${newStatus}`);
      fetchSummary();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update threat status');
    }
  };

  const hasActiveFilters = filters.severity || filters.status;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-7 h-7 animate-spin text-primary mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Loading threats…</p>
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
            <h1 className="text-xl font-black uppercase tracking-tight text-foreground">Threat Detection</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Suspicious activities flagged and routed to the deception backend
            </p>
          </div>
          <div className="flex gap-2">
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
            <StatCard label="Total Threats" value={summary.total_threats} />
            <StatCard
              label="Active"
              value={summary.active_threats}
              accent={STATUS_CONFIG.active.color}
            />
            <StatCard
              label="Contained"
              value={summary.contained_threats}
              accent={STATUS_CONFIG.contained.color}
            />
            <StatCard
              label="Resolved"
              value={summary.resolved_threats}
              accent={STATUS_CONFIG.resolved.color}
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
                      Severity
                    </label>
                    <select
                      value={filters.severity}
                      onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary h-9"
                    >
                      <option value="">All Severities</option>
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
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
                      <option value="active">Active</option>
                      <option value="contained">Contained</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>
                </div>
                {hasActiveFilters && (
                  <Button
                    onClick={() => setFilters({ severity: '', status: '' })}
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
        {filteredThreats.length === 0 ? (
          <div className="border border-border bg-card py-20 text-center">
            <Shield size={32} className="mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-sm font-semibold text-foreground mb-1">No threats detected</p>
            <p className="text-xs text-muted-foreground">
              {hasActiveFilters ? 'Try adjusting your filters' : 'All monitored sessions appear clean'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {filteredThreats.map((threat, idx) => {
                const isExpanded = expandedId === threat.id;
                const statusCfg = STATUS_CONFIG[threat.status as Status] ?? STATUS_CONFIG.resolved;

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
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <StatusBadge status={threat.status} />
                          <span className="text-muted-foreground/30 text-xs">·</span>
                          <span className="text-sm font-bold text-foreground truncate">
                            {threat.threat_type}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-[11px] font-mono text-muted-foreground hidden sm:block">
                            {fmt(threat.timestamp)}
                          </span>
                          <SeverityPill severity={threat.severity} />
                          {!isExpanded && (
                            <ChevronRight size={14} className="text-muted-foreground/50" />
                          )}
                        </div>
                      </div>

                      {/* Quick info row (visible when collapsed) */}
                      {!isExpanded && (
                        <div className="flex items-center gap-4 mt-2 text-[10px] font-mono text-muted-foreground">
                          <span>{threat.domain}</span>
                          <span>·</span>
                          <span>{threat.ip_address}</span>
                          <span>·</span>
                          <span className="truncate">{threat.session_id.slice(0, 12)}…</span>
                        </div>
                      )}
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
                            <div className="grid grid-cols-3 gap-4">
                              <InfoRow label="Domain" value={threat.domain} />
                              <InfoRow label="Session ID" value={threat.session_id} />
                              <InfoRow label="IP Address" value={threat.ip_address} />
                            </div>

                            {/* Description */}
                            <div>
                              <MetaLabel>Description</MetaLabel>
                              <p className="text-xs text-foreground/80 leading-relaxed">
                                {threat.description}
                              </p>
                            </div>

                            {/* Indicators */}
                            <div>
                              <MetaLabel>Threat Indicators</MetaLabel>
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                {threat.indicators.map((indicator) => (
                                  <span
                                    key={indicator}
                                    className="text-[10px] font-mono px-2 py-0.5 bg-muted border border-border text-foreground/70"
                                  >
                                    {indicator}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Status message & actions */}
                            <div className="pt-2 border-t border-border">
                              {threat.status === 'active' && (
                                <div className="flex items-center justify-between flex-wrap gap-3">
                                  <div className="flex items-center gap-2">
                                    <AlertCircle size={13} style={{ color: statusCfg.color }} />
                                    <span
                                      className="text-[11px] font-bold uppercase tracking-widest"
                                      style={{ color: '#F59E0B' }}
                                    >
                                      Pending swap approval — review in Active Sessions
                                    </span>
                                  </div>
                                  <Button
                                    onClick={() => handleUpdateStatus(threat.id, 'contained')}
                                    variant="outline"
                                    className="h-8 px-4 text-xs font-semibold border-border hover:bg-muted"
                                    style={{ color: STATUS_CONFIG.contained.color }}
                                  >
                                    <Clock size={12} className="mr-1.5" />
                                    Contain
                                  </Button>
                                </div>
                              )}

                              {threat.status === 'contained' && (
                                <div className="flex items-center justify-between flex-wrap gap-3">
                                  <div className="flex items-center gap-2">
                                    <Clock size={13} style={{ color: statusCfg.color }} />
                                    <span
                                      className="text-[11px] font-bold uppercase tracking-widest"
                                      style={{ color: statusCfg.color }}
                                    >
                                      Awaiting resolution
                                    </span>
                                  </div>
                                  <Button
                                    onClick={() => handleUpdateStatus(threat.id, 'resolved')}
                                    variant="outline"
                                    className="h-8 px-4 text-xs font-semibold border-border hover:bg-muted"
                                    style={{ color: STATUS_CONFIG.resolved.color }}
                                  >
                                    <CheckCircle size={12} className="mr-1.5" />
                                    Resolve
                                  </Button>
                                </div>
                              )}

                              {threat.status === 'resolved' && (
                                <div className="flex items-center gap-2">
                                  <CheckCircle size={13} style={{ color: statusCfg.color }} />
                                  <span
                                    className="text-[11px] font-bold uppercase tracking-widest"
                                    style={{ color: statusCfg.color }}
                                  >
                                    Resolved — no further action required
                                  </span>
                                </div>
                              )}
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

export default ThreatDetection;