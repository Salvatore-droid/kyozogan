import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '@/components/DashboardLayout';
import EnvironmentViewer from '@/components/EnvironmentViewer';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Filter, Activity, Shield, Target, Clock, Brain, Wifi, Server, Database, Cloud, Mail, X, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { api, DeceptionEnvironment } from '@/lib/api';

/* ─── Helpers ────────────────────────────────────────────────── */
const STATUS_CONFIG = {
  active:       { label: 'Active',       color: '#388E3C', bg: '#388E3C18', pulse: false },
  under_attack: { label: 'Under Attack', color: '#D32F2F', bg: '#D32F2F18', pulse: true },
  compromised:  { label: 'Compromised',  color: '#F57C00', bg: '#F57C0018', pulse: true },
  idle:         { label: 'Idle',         color: '#90A4AE', bg: '#90A4AE18', pulse: false },
  maintenance:  { label: 'Maintenance',  color: '#FF9800', bg: '#FF980018', pulse: false },
} as const;

const TYPE_ICONS: Record<string, React.ElementType> = {
  admin_panel: Shield,
  database: Database,
  api: Cloud,
  file_server: Server,
  email_server: Mail,
  iot_device: Wifi,
  cloud_console: Cloud,
  crm_system: Activity,
};

const TYPE_LABELS: Record<string, string> = {
  admin_panel: 'Admin Panel',
  database: 'Database',
  api: 'API Server',
  file_server: 'File Server',
  email_server: 'Email Server',
  iot_device: 'IoT Device',
  cloud_console: 'Cloud Console',
  crm_system: 'CRM System',
};

type Status = keyof typeof STATUS_CONFIG;

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
  const cfg = STATUS_CONFIG[status as Status] ?? STATUS_CONFIG.idle;
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

/* ─── Main Component ─────────────────────────────────────────── */
const Environments = () => {
  const [environments, setEnvironments] = useState<DeceptionEnvironment[]>([]);
  const [filteredEnvironments, setFilteredEnvironments] = useState<DeceptionEnvironment[]>([]);
  const [selectedEnv, setSelectedEnv] = useState<DeceptionEnvironment | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [summary, setSummary] = useState<{
    total_environments: number;
    active_environments: number;
    under_attack: number;
    total_attackers_trapped: number;
    avg_ai_adaptation: number;
  } | null>(null);
  const [filters, setFilters] = useState({
    type: '',
    status: '',
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchEnvironments(true);
        fetchSummary();
      }, 15000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  useEffect(() => {
    let filtered = [...environments];
    if (filters.type) {
      filtered = filtered.filter((e) => e.type === filters.type);
    }
    if (filters.status) {
      filtered = filtered.filter((e) => e.status === filters.status);
    }
    setFilteredEnvironments(filtered);
  }, [filters, environments]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [envData, summaryData] = await Promise.all([
        api.getEnvironments({ limit: 100 }),
        api.getEnvironmentsSummary(),
      ]);
      setEnvironments(envData);
      setSummary({
        total_environments: summaryData.total_environments,
        active_environments: summaryData.active_environments,
        under_attack: summaryData.under_attack,
        total_attackers_trapped: summaryData.total_attackers_trapped,
        avg_ai_adaptation: summaryData.avg_ai_adaptation,
      });
      setLastRefresh(new Date());
    } catch (error: any) {
      toast.error(error.message || 'Failed to load deception environments');
    } finally {
      setLoading(false);
    }
  };

  const fetchEnvironments = async (silent: boolean = false) => {
    if (!silent) setRefreshing(true);
    try {
      const data = await api.getEnvironments({ limit: 100 });
      setEnvironments(data);
      setLastRefresh(new Date());
    } catch (error: any) {
      if (!silent) {
        toast.error(error.message || 'Failed to refresh environments');
      }
    } finally {
      if (!silent) setRefreshing(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const data = await api.getEnvironmentsSummary();
      setSummary({
        total_environments: data.total_environments,
        active_environments: data.active_environments,
        under_attack: data.under_attack,
        total_attackers_trapped: data.total_attackers_trapped,
        avg_ai_adaptation: data.avg_ai_adaptation,
      });
    } catch {
      /* summary endpoint may not be available */
    }
  };

  const handleRefresh = async () => {
    await Promise.all([fetchEnvironments(false), fetchSummary()]);
    toast.success('Environments refreshed');
  };

  const hasActiveFilters = filters.type || filters.status;

  const getTypeIcon = (type: string) => {
    const Icon = TYPE_ICONS[type];
    return Icon ? <Icon size={14} className="text-primary" /> : <Shield size={14} className="text-primary" />;
  };

  const getTypeLabel = (type: string) => TYPE_LABELS[type] || type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

  if (loading && environments.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-7 h-7 animate-spin text-primary mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Loading deception environments…</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">

        {/* ── Page header ──────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-6 pb-5 border-b border-border">
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight text-foreground">Deception Environments</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Active honeypots and decoy systems currently monitoring attacker behavior
            </p>
            {autoRefresh && (
              <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                Auto-refresh every 15s · Last: {lastRefresh.toLocaleTimeString()}
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
          <div className="grid grid-cols-5 border border-border mb-6">
            <StatCard label="Total Environments" value={summary.total_environments} accent="hsl(var(--primary))" />
            <StatCard label="Active" value={summary.active_environments} accent={STATUS_CONFIG.active.color} />
            <StatCard label="Under Attack" value={summary.under_attack} accent={STATUS_CONFIG.under_attack.color} />
            <StatCard label="Attackers Trapped" value={summary.total_attackers_trapped} accent="#FBC02D" />
            <StatCard label="Avg AI Adaptation" value={summary.avg_ai_adaptation} accent="#0D7377" />
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
                <span className="text-xs font-bold uppercase tracking-widest text-primary">Filter Environments</span>
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
                      Environment Type
                    </label>
                    <select
                      value={filters.type}
                      onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary h-9"
                    >
                      <option value="">All Types</option>
                      {Object.entries(TYPE_LABELS).map(([value, label]) => (
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
                </div>
                {hasActiveFilters && (
                  <Button
                    onClick={() => setFilters({ type: '', status: '' })}
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
        {filteredEnvironments.length === 0 ? (
          <div className="border border-border bg-card py-20 text-center">
            <Shield size={32} className="mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-sm font-semibold text-foreground mb-1">No deception environments found</p>
            <p className="text-xs text-muted-foreground">
              {hasActiveFilters ? 'Try adjusting your filters' : 'Create your first environment to start trapping attackers'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEnvironments.map((env, idx) => {
              const statusCfg = STATUS_CONFIG[env.status as Status] ?? STATUS_CONFIG.idle;
              const TypeIcon = getTypeIcon(env.type);

              return (
                <motion.div
                  key={env.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.04, 0.3), duration: 0.2 }}
                  onClick={() => setSelectedEnv(env)}
                  className="border border-border bg-card overflow-hidden cursor-pointer transition-all hover:border-primary/50"
                >
                  {/* Card header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {TypeIcon}
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{env.name}</p>
                        <p className="text-[10px] text-muted-foreground">{getTypeLabel(env.type)}</p>
                      </div>
                    </div>
                    <StatusBadge status={env.status} />
                  </div>

                  {/* Metrics row */}
                  <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
                    <div className="px-4 py-3 text-center">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">
                        Attackers
                      </p>
                      <p className="text-lg font-black font-mono text-primary">{env.attacker_count}</p>
                    </div>
                    <div className="px-4 py-3 text-center">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">
                        Honeypots
                      </p>
                      <p className="text-lg font-black font-mono text-foreground">{env.honeypots}</p>
                    </div>
                    <div className="px-4 py-3 text-center">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">
                        AI Level
                      </p>
                      <p className="text-lg font-black font-mono text-cyan-600">{env.ai_adaptation_level}%</p>
                    </div>
                  </div>

                  {/* AI Adaptation bar */}
                  <div className="px-4 py-3 border-b border-border/60">
                    <div className="flex items-center justify-between mb-1.5">
                      <MetaLabel>AI Adaptation</MetaLabel>
                      <Brain size={12} className="text-primary" />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-primary"
                          initial={{ width: 0 }}
                          animate={{ width: `${env.ai_adaptation_level}%` }}
                          transition={{ duration: 0.6, delay: idx * 0.02 }}
                        />
                      </div>
                      <span className="text-[10px] font-mono font-bold text-primary">
                        {env.ai_adaptation_level}%
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="px-4 py-3 border-b border-border/60">
                    <MetaLabel>Description</MetaLabel>
                    <p className="text-xs text-foreground/80 line-clamp-2">{env.description}</p>
                  </div>

                  {/* Last triggered */}
                  <div className="px-4 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Clock size={10} className="text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">Last triggered</span>
                    </div>
                    <span className="text-[10px] font-mono text-foreground/70">{fmtDate(env.last_triggered)}</span>
                  </div>

                  {/* Footer hint */}
                  <div className="px-4 py-2 border-t border-border bg-muted/20">
                    <p className="text-[10px] text-primary font-medium flex items-center justify-end gap-1">
                      Click to view interface
                      <ChevronRight size={10} />
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* ── Environment Viewer Modal ─────────────────────────── */}
        <AnimatePresence>
          {selectedEnv && (
            <EnvironmentViewer 
              environment={{
                id: selectedEnv.id,
                name: selectedEnv.name,
                type: selectedEnv.type,
                type_display: getTypeLabel(selectedEnv.type),
                status: selectedEnv.status,
                description: selectedEnv.description,
                attackerCount: selectedEnv.attacker_count,
                aiAdaptationLevel: selectedEnv.ai_adaptation_level,
                honeypots: selectedEnv.honeypots,
                lastTriggered: new Date(selectedEnv.last_triggered),
              }} 
              onClose={() => setSelectedEnv(null)} 
            />
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
};

export default Environments;