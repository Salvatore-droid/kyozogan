import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  Filter,
  Loader2,
  RefreshCw,
  Shield,
  Activity,
  Globe,
  Target,
  Clock,
  Brain,
  TrendingUp,
  MapPin,
  Wifi,
  X,
  ChevronRight,
  Hash,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, AttackerProfile, AttackerBehaviorLog } from '@/lib/api';

/* ─── Helpers ────────────────────────────────────────────────── */
const SKILL_CONFIG = {
  novice:        { label: 'Novice',       color: '#0D7377', bg: '#0D737718' },
  intermediate:  { label: 'Intermediate', color: '#F57C00', bg: '#F57C0018' },
  advanced:      { label: 'Advanced',     color: '#D32F2F', bg: '#D32F2F18' },
  expert:        { label: 'Expert',       color: '#8B0000', bg: '#8B000018' },
} as const;

const STATUS_CONFIG = {
  active:  { label: 'Active',  color: '#388E3C', bg: '#388E3C18', pulse: true },
  idle:    { label: 'Idle',    color: '#90A4AE', bg: '#90A4AE18', pulse: false },
  trapped: { label: 'Trapped', color: '#D32F2F', bg: '#D32F2F18', pulse: true },
  evaded:  { label: 'Evaded',  color: '#FF9800', bg: '#FF980018', pulse: false },
} as const;

type SkillLevel = keyof typeof SKILL_CONFIG;
type Status = keyof typeof STATUS_CONFIG;

const fmtDate = (d: string) => {
  const date = new Date(d);
  return (
    date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' · ' +
    date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  );
};

const getBehaviorIcon = (type: string) => {
  switch (type) {
    case 'probe': return <Target size={12} />;
    case 'attack': return <Activity size={12} />;
    case 'lateral_movement': return <Shield size={12} />;
    default: return <Activity size={12} />;
  }
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

function SkillBadge({ level }: { level: string }) {
  const cfg = SKILL_CONFIG[level as SkillLevel] ?? SKILL_CONFIG.novice;
  return (
    <span
      className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 border"
      style={{ color: cfg.color, borderColor: cfg.color, backgroundColor: cfg.bg }}
    >
      {cfg.label}
    </span>
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

function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <MetaLabel>{label}</MetaLabel>
      <p className={`text-xs ${mono ? 'font-mono' : ''} text-foreground/80 break-all`}>{value || '—'}</p>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────── */
const Attackers = () => {
  const [attackers, setAttackers] = useState<AttackerProfile[]>([]);
  const [filteredAttackers, setFilteredAttackers] = useState<AttackerProfile[]>([]);
  const [selectedAttacker, setSelectedAttacker] = useState<AttackerProfile | null>(null);
  const [behaviorLogs, setBehaviorLogs] = useState<AttackerBehaviorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [summary, setSummary] = useState<{
    total_attackers: number;
    active_attackers: number;
    trapped_attackers: number;
    avg_threat_score: number;
  } | null>(null);
  const [filters, setFilters] = useState({
    skill_level: '',
    status: '',
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    let filtered = [...attackers];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.id.toLowerCase().includes(term) ||
          a.fingerprint.toLowerCase().includes(term) ||
          a.country.toLowerCase().includes(term) ||
          a.ip_address.includes(term)
      );
    }

    if (filters.skill_level) {
      filtered = filtered.filter((a) => a.skill_level === filters.skill_level);
    }

    if (filters.status) {
      filtered = filtered.filter((a) => a.status === filters.status);
    }

    setFilteredAttackers(filtered);
  }, [searchTerm, filters, attackers]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [attackersData, summaryData] = await Promise.all([
        api.getAttackers({ limit: 100 }),
        api.getAttackersSummary(),
      ]);
      setAttackers(attackersData);
      setSummary({
        total_attackers: summaryData.total_attackers,
        active_attackers: summaryData.active_attackers,
        trapped_attackers: summaryData.trapped_attackers,
        avg_threat_score: summaryData.avg_threat_score,
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to load attackers');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const [attackersData, summaryData] = await Promise.all([
        api.getAttackers({ limit: 100 }),
        api.getAttackersSummary(),
      ]);
      setAttackers(attackersData);
      setSummary({
        total_attackers: summaryData.total_attackers,
        active_attackers: summaryData.active_attackers,
        trapped_attackers: summaryData.trapped_attackers,
        avg_threat_score: summaryData.avg_threat_score,
      });
      toast.success('Attackers refreshed');
    } catch (error: any) {
      toast.error(error.message || 'Failed to refresh');
    } finally {
      setRefreshing(false);
    }
  };

  const fetchBehaviorLogs = async (attackerId: string) => {
    try {
      const logs = await api.getAttackerBehaviorLogs(attackerId, 20);
      setBehaviorLogs(logs);
    } catch {
      /* behavior logs may not be available */
    }
  };

  const handleSelectAttacker = async (attacker: AttackerProfile) => {
    setSelectedAttacker(attacker);
    await fetchBehaviorLogs(attacker.id);
  };

  const hasActiveFilters = filters.skill_level || filters.status || searchTerm;

  if (loading && attackers.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-7 h-7 animate-spin text-primary mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Loading attacker profiles…</p>
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
            <h1 className="text-xl font-black uppercase tracking-tight text-foreground">Attacker Profiles</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Detailed analysis of detected attackers and their behavior patterns
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
            <StatCard label="Total Attackers" value={summary.total_attackers} accent="hsl(var(--primary))" />
            <StatCard label="Active" value={summary.active_attackers} accent={STATUS_CONFIG.active.color} />
            <StatCard label="Trapped" value={summary.trapped_attackers} accent={STATUS_CONFIG.trapped.color} />
            <StatCard label="Avg Threat Score" value={summary.avg_threat_score} accent="#FBC02D" />
          </div>
        )}

        {/* ── Search & Filter bar ───────────────────────────────── */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" size={15} />
            <Input
              placeholder="Search by ID, fingerprint, country, or IP address…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-background border-border text-foreground h-9 text-sm"
            />
          </div>
        </div>

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
                <span className="text-xs font-bold uppercase tracking-widest text-primary">Filter Attackers</span>
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
                      Skill Level
                    </label>
                    <select
                      value={filters.skill_level}
                      onChange={(e) => setFilters({ ...filters, skill_level: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary h-9"
                    >
                      <option value="">All Levels</option>
                      <option value="novice">Novice</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                      <option value="expert">Expert</option>
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
                      <option value="idle">Idle</option>
                      <option value="trapped">Trapped</option>
                      <option value="evaded">Evaded</option>
                    </select>
                  </div>
                </div>
                {hasActiveFilters && (
                  <Button
                    onClick={() => {
                      setFilters({ skill_level: '', status: '' });
                      setSearchTerm('');
                    }}
                    variant="outline"
                    className="border-border text-foreground/70 hover:bg-muted h-9 px-5 text-sm font-semibold"
                  >
                    Clear All Filters
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Two-column layout (list + detail) ─────────────────── */}
        <div className="flex gap-6">
          {/* Left — Attackers grid */}
          <div className="flex-1 min-w-0">
            {filteredAttackers.length === 0 ? (
              <div className="border border-border bg-card py-20 text-center">
                <Shield size={32} className="mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-sm font-semibold text-foreground mb-1">No attackers found</p>
                <p className="text-xs text-muted-foreground">
                  {hasActiveFilters ? 'Try adjusting your filters' : 'Attackers will appear here as threats are detected'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredAttackers.map((attacker, idx) => {
                  const skillCfg = SKILL_CONFIG[attacker.skill_level as SkillLevel] ?? SKILL_CONFIG.novice;
                  const isSelected = selectedAttacker?.id === attacker.id;

                  return (
                    <motion.div
                      key={attacker.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(idx * 0.03, 0.3), duration: 0.2 }}
                      onClick={() => handleSelectAttacker(attacker)}
                      className={`border bg-card overflow-hidden cursor-pointer transition-all ${
                        isSelected
                          ? 'border-primary/70 bg-primary/5'
                          : 'border-border hover:border-muted-foreground/30'
                      }`}
                    >
                      {/* Card header */}
                      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20">
                        <div className="flex items-center gap-2 min-w-0">
                          <User size={14} className="text-primary flex-shrink-0" />
                          <span className="text-sm font-bold text-foreground truncate">{attacker.id}</span>
                        </div>
                        <StatusBadge status={attacker.status} />
                      </div>

                      {/* Fingerprint */}
                      <div className="px-4 py-2 border-b border-border/60 bg-muted/5">
                        <p className="text-[10px] font-mono text-muted-foreground truncate">
                          {attacker.fingerprint}
                        </p>
                      </div>

                      {/* Origin row */}
                      <div className="px-4 py-2.5 flex items-center justify-between border-b border-border/60">
                        <div className="flex items-center gap-2">
                          <Globe size={12} className="text-muted-foreground" />
                          <span className="text-xs font-semibold text-foreground">{attacker.country}</span>
                        </div>
                        <span className="text-[11px] font-mono text-muted-foreground">{attacker.ip_address}</span>
                      </div>

                      {/* Metrics row */}
                      <div className="grid grid-cols-3 divide-x divide-border">
                        <div className="px-3 py-2 text-center">
                          <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Time</p>
                          <p className="text-xs font-mono font-bold text-foreground">{attacker.time_in_environment}m</p>
                        </div>
                        <div className="px-3 py-2 text-center">
                          <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Interactions</p>
                          <p className="text-xs font-mono font-bold text-foreground">{attacker.total_interactions}</p>
                        </div>
                        <div className="px-3 py-2 text-center">
                          <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Threat</p>
                          <p className="text-xs font-mono font-bold" style={{ color: skillCfg.color }}>
                            {attacker.threat_score}%
                          </p>
                        </div>
                      </div>

                      {/* Techniques */}
                      {attacker.techniques.length > 0 && (
                        <div className="px-4 py-2.5 border-t border-border/60">
                          <div className="flex flex-wrap gap-1">
                            {attacker.techniques.slice(0, 3).map((tech) => (
                              <span
                                key={tech}
                                className="text-[9px] font-mono px-1.5 py-0.5 bg-muted border border-border text-muted-foreground"
                              >
                                {tech}
                              </span>
                            ))}
                            {attacker.techniques.length > 3 && (
                              <span className="text-[9px] font-mono px-1.5 py-0.5 text-muted-foreground">
                                +{attacker.techniques.length - 3}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right — Detail panel */}
          <AnimatePresence>
            {selectedAttacker && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="w-96 flex-shrink-0 border border-border bg-card overflow-y-auto max-h-[calc(100vh-200px)] sticky top-6"
              >
                {/* Detail header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/30">
                  <span className="text-xs font-bold uppercase tracking-widest text-foreground">
                    Attacker Details
                  </span>
                  <button
                    onClick={() => setSelectedAttacker(null)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X size={15} />
                  </button>
                </div>

                <div className="px-5 py-4 space-y-5">
                  {/* Basic info */}
                  <div className="space-y-3 pb-4 border-b border-border/60">
                    <InfoRow label="Attacker ID" value={selectedAttacker.id} mono />
                    <InfoRow label="Fingerprint" value={selectedAttacker.fingerprint} mono />
                    <InfoRow label="IP Address" value={selectedAttacker.ip_address} mono />
                    <div>
                      <MetaLabel>Location</MetaLabel>
                      <div className="flex items-center gap-2">
                        <MapPin size={12} className="text-muted-foreground" />
                        <span className="text-xs text-foreground">{selectedAttacker.country}</span>
                        {selectedAttacker.city && (
                          <span className="text-xs text-muted-foreground">({selectedAttacker.city})</span>
                        )}
                      </div>
                    </div>
                    {selectedAttacker.isp && (
                      <div>
                        <MetaLabel>ISP</MetaLabel>
                        <div className="flex items-center gap-2">
                          <Wifi size={12} className="text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{selectedAttacker.isp}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Activity info */}
                  <div className="space-y-3 pb-4 border-b border-border/60">
                    <div className="flex items-center justify-between">
                      <MetaLabel>Status</MetaLabel>
                      <StatusBadge status={selectedAttacker.status} />
                    </div>
                    <InfoRow label="Skill Level" value={selectedAttacker.skill_level} />
                    <InfoRow label="Time in Environment" value={`${selectedAttacker.time_in_environment} minutes`} />
                    <InfoRow label="Total Interactions" value={String(selectedAttacker.total_interactions)} />
                    <InfoRow label="First Seen" value={fmtDate(selectedAttacker.first_seen)} />
                    <InfoRow label="Last Activity" value={fmtDate(selectedAttacker.last_activity)} />
                  </div>

                  {/* Threat metrics */}
                  <div className="space-y-3 pb-4 border-b border-border/60">
                    <div className="flex items-center gap-2">
                      <TrendingUp size={12} className="text-primary" />
                      <MetaLabel>Threat Assessment</MetaLabel>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${selectedAttacker.threat_score}%`,
                            backgroundColor: SKILL_CONFIG[selectedAttacker.skill_level as SkillLevel]?.color ?? '#0D7377',
                          }}
                        />
                      </div>
                      <span className="text-xs font-mono font-bold">{selectedAttacker.threat_score}%</span>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <MetaLabel>Deception Susceptibility</MetaLabel>
                        <Brain size={12} className="text-primary" />
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${selectedAttacker.deception_susceptibility}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono font-bold text-primary">
                          {selectedAttacker.deception_susceptibility}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Techniques */}
                  {selectedAttacker.techniques.length > 0 && (
                    <div className="pb-4 border-b border-border/60">
                      <MetaLabel>Techniques Used</MetaLabel>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {selectedAttacker.techniques.map((tech) => (
                          <span
                            key={tech}
                            className="text-[10px] font-mono px-2 py-0.5 bg-muted border border-border text-foreground/70"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Behavior logs */}
                  {behaviorLogs.length > 0 && (
                    <div className="pb-4 border-b border-border/60">
                      <MetaLabel>Recent Behavior</MetaLabel>
                      <div className="space-y-2 mt-1 max-h-48 overflow-y-auto">
                        {behaviorLogs.slice(0, 5).map((log) => (
                          <div key={log.id} className="p-2 bg-muted/30 border border-border/60 rounded">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1.5">
                                {getBehaviorIcon(log.behavior_type)}
                                <span className="text-[10px] font-bold uppercase tracking-wider">
                                  {log.behavior_type}
                                </span>
                              </div>
                              <span className="text-[10px] font-mono text-muted-foreground">
                                {new Date(log.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-[11px] text-foreground/80">{log.description}</p>
                            {log.technique && (
                              <p className="text-[10px] text-primary mt-1 font-mono">Technique: {log.technique}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI behavior summary */}
                  {selectedAttacker.behavior_summary && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Brain size={12} className="text-primary" />
                        <MetaLabel>AI Behavior Analysis</MetaLabel>
                      </div>
                      <p className="text-xs text-foreground/80 leading-relaxed">
                        {selectedAttacker.behavior_summary}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Attackers;