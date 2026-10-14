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
  TrendingUp,
  AlertTriangle,
  Shield,
  X,
  ChevronRight,
  Hash,
  Globe,
  Calendar,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { toast } from 'sonner';
import { api, AttackPattern, PatternLearningData } from '@/lib/api';

/* ─── Helpers ────────────────────────────────────────────────── */
const SEVERITY_CONFIG = {
  critical: { label: 'Critical', color: '#D32F2F', bg: '#D32F2F18' },
  high:     { label: 'High',     color: '#F57C00', bg: '#F57C0018' },
  medium:   { label: 'Medium',   color: '#FBC02D', bg: '#FBC02D18' },
  low:      { label: 'Low',      color: '#388E3C', bg: '#388E3C18' },
} as const;

type Severity = keyof typeof SEVERITY_CONFIG;

const fmtDate = (d: string) => {
  const date = new Date(d);
  return (
    date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' · ' +
    date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  );
};

const fmtTimeShort = (d: string) => {
  const date = new Date(d);
  return `${date.getHours()}:00`;
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
      <p className={`text-xs ${mono ? 'font-mono' : ''} text-foreground/80`}>{value || '—'}</p>
    </div>
  );
}

/* ─── Custom Tooltip for Chart ───────────────────────────────── */
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-card border border-border px-3 py-2 shadow-lg">
      <p className="text-[10px] font-mono text-muted-foreground mb-1">{label}</p>
      {payload.map((p: any, idx: number) => (
        <p key={idx} className="text-xs font-semibold" style={{ color: p.color }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

/* ─── Main Component ─────────────────────────────────────────── */
const AttackPatterns = () => {
  const [patterns, setPatterns] = useState<AttackPattern[]>([]);
  const [filteredPatterns, setFilteredPatterns] = useState<AttackPattern[]>([]);
  const [learningData, setLearningData] = useState<PatternLearningData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [summary, setSummary] = useState<{
    total_patterns: number;
    total_detections: number;
    critical_patterns: number;
    high_patterns: number;
  } | null>(null);
  const [filters, setFilters] = useState({
    category: '',
    severity: '',
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    let filtered = [...patterns];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.technique.toLowerCase().includes(term) ||
          p.description.toLowerCase().includes(term) ||
          p.indicators.some((i) => i.toLowerCase().includes(term))
      );
    }

    if (filters.category) {
      filtered = filtered.filter((p) => p.category === filters.category);
    }

    if (filters.severity) {
      filtered = filtered.filter((p) => p.severity === filters.severity);
    }

    setFilteredPatterns(filtered);
  }, [searchTerm, filters, patterns]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [patternsData, summaryData, trendsData] = await Promise.all([
        api.getAttackPatterns({ limit: 100 }),
        api.getAttackPatternsSummary(),
        api.getPatternLearningTrends(24),
      ]);
      setPatterns(patternsData);
      setLearningData(trendsData);
      setSummary({
        total_patterns: summaryData.total_patterns,
        total_detections: summaryData.total_detections,
        critical_patterns: summaryData.critical_patterns,
        high_patterns: summaryData.high_patterns,
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to load attack patterns');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const [patternsData, summaryData, trendsData] = await Promise.all([
        api.getAttackPatterns({ limit: 100 }),
        api.getAttackPatternsSummary(),
        api.getPatternLearningTrends(24),
      ]);
      setPatterns(patternsData);
      setLearningData(trendsData);
      setSummary({
        total_patterns: summaryData.total_patterns,
        total_detections: summaryData.total_detections,
        critical_patterns: summaryData.critical_patterns,
        high_patterns: summaryData.high_patterns,
      });
      toast.success('Attack patterns refreshed');
    } catch (error: any) {
      toast.error(error.message || 'Failed to refresh');
    } finally {
      setRefreshing(false);
    }
  };

  const getUniqueCategories = () => {
    const categories = new Set(patterns.map((p) => p.category));
    return Array.from(categories);
  };

  const hasActiveFilters = filters.category || filters.severity || searchTerm;

  if (loading && patterns.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-7 h-7 animate-spin text-primary mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Loading attack patterns…</p>
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
            <h1 className="text-xl font-black uppercase tracking-tight text-foreground">Attack Pattern Learning</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Discovered attack techniques and patterns learned from engaged sessions
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
            <StatCard label="Total Patterns" value={summary.total_patterns} accent="hsl(var(--primary))" />
            <StatCard
              label="Total Detections"
              value={summary.total_detections}
              accent="#FBC02D"
            />
            <StatCard
              label="Critical Threats"
              value={summary.critical_patterns}
              accent={SEVERITY_CONFIG.critical.color}
            />
            <StatCard
              label="High Threats"
              value={summary.high_patterns}
              accent={SEVERITY_CONFIG.high.color}
            />
          </div>
        )}

        {/* ── Search & Filter bar ───────────────────────────────── */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" size={15} />
            <Input
              placeholder="Search by technique, description, or indicators…"
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
                <span className="text-xs font-bold uppercase tracking-widest text-primary">Filter Patterns</span>
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
                      Category
                    </label>
                    <select
                      value={filters.category}
                      onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary h-9"
                    >
                      <option value="">All Categories</option>
                      {getUniqueCategories().map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>
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
                </div>
                {hasActiveFilters && (
                  <Button
                    onClick={() => {
                      setFilters({ category: '', severity: '' });
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

        {/* ── Learning Trends Chart ─────────────────────────────── */}
        {learningData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="border border-border bg-card mb-6 overflow-hidden"
          >
            <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-border bg-muted/30">
              <TrendingUp size={15} className="text-primary flex-shrink-0" />
              <span className="text-xs font-bold uppercase tracking-widest text-foreground">
                Pattern Discovery Trends (24h)
              </span>
            </div>
            <div className="px-5 py-4">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={learningData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="timestamp"
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fontSize: 10, fontFamily: 'monospace' }}
                    tickFormatter={fmtTimeShort}
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: 10, paddingTop: 12 }}
                    formatter={(value) => <span className="text-xs text-foreground">{value}</span>}
                  />
                  <Line
                    type="monotone"
                    dataKey="new_patterns"
                    stroke="#0D7377"
                    strokeWidth={2}
                    dot={false}
                    name="New Patterns"
                  />
                  <Line
                    type="monotone"
                    dataKey="repeating_patterns"
                    stroke="#F57C00"
                    strokeWidth={2}
                    dot={false}
                    name="Repeating Patterns"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        {/* ── Empty state ──────────────────────────────────────── */}
        {filteredPatterns.length === 0 ? (
          <div className="border border-border bg-card py-20 text-center">
            <Shield size={32} className="mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-sm font-semibold text-foreground mb-1">No attack patterns found</p>
            <p className="text-xs text-muted-foreground">
              {hasActiveFilters ? 'Try adjusting your search or filters' : 'Patterns will appear as threats are analyzed'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Discovered Techniques ({filteredPatterns.length})
              </h2>
            </div>
            <AnimatePresence>
              {filteredPatterns.map((pattern, idx) => {
                const isExpanded = expandedId === pattern.id;
                const severityCfg = SEVERITY_CONFIG[pattern.severity as Severity] ?? SEVERITY_CONFIG.low;

                return (
                  <motion.div
                    key={pattern.id}
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
                      onClick={() => setExpandedId(isExpanded ? null : pattern.id)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <SeverityPill severity={pattern.severity} />
                            <span className="text-xs text-muted-foreground font-mono">{pattern.category}</span>
                            {pattern.mitre_id && (
                              <span className="text-[10px] font-mono text-primary/70 border border-primary/30 px-1.5 py-0.5">
                                {pattern.mitre_id}
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-bold text-foreground mt-1.5 truncate">
                            {pattern.technique}
                          </p>
                          <div className="flex items-center gap-3 mt-1.5 text-[10px] font-mono text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Hash size={10} />
                              {pattern.frequency} detections
                            </span>
                            <span>·</span>
                            <span className="flex items-center gap-1">
                              <Globe size={10} />
                              {pattern.sites_affected} site(s)
                            </span>
                            <span>·</span>
                            <span className="flex items-center gap-1">
                              <Calendar size={10} />
                              {fmtDate(pattern.last_seen)}
                            </span>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          {!isExpanded && <ChevronRight size={14} className="text-muted-foreground/50" />}
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
                            {/* Description */}
                            <div>
                              <MetaLabel>Description</MetaLabel>
                              <p className="text-xs text-foreground/80 leading-relaxed">
                                {pattern.description}
                              </p>
                            </div>

                            {/* Frequency bar */}
                            <div>
                              <MetaLabel>Detection Frequency</MetaLabel>
                              <div className="flex items-center gap-3">
                                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                  <motion.div
                                    className="h-full rounded-full"
                                    style={{ backgroundColor: severityCfg.color }}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min((pattern.frequency / 500) * 100, 100)}%` }}
                                    transition={{ duration: 0.4 }}
                                  />
                                </div>
                                <span className="text-xs font-mono font-bold" style={{ color: severityCfg.color }}>
                                  {pattern.frequency}
                                </span>
                              </div>
                            </div>

                            {/* Indicators */}
                            <div>
                              <MetaLabel>Indicators</MetaLabel>
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                {pattern.indicators.map((indicator) => (
                                  <span
                                    key={indicator}
                                    className="text-[10px] font-mono px-2 py-0.5 bg-muted border border-border text-foreground/70"
                                  >
                                    {indicator}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Footer stats */}
                            <div className="flex items-center justify-between pt-2 border-t border-border/60">
                              <span className="text-[10px] font-mono text-muted-foreground">
                                First detected: {new Date(pattern.last_seen).toLocaleDateString()}
                              </span>
                              <span
                                className="text-[10px] font-bold px-2 py-0.5"
                                style={{
                                  backgroundColor: `${severityCfg.color}20`,
                                  color: severityCfg.color,
                                }}
                              >
                                {pattern.detection_count} total detections
                              </span>
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

export default AttackPatterns;