import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Loader2, TrendingUp, TrendingDown, Activity, Globe, Target, Clock, Shield, Zap } from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { toast } from 'sonner';
import { api, AnalyticsTrend, AttackLocation, SkillDistribution, AnalyticsSummary } from '@/lib/api';

/* ─── Helpers ────────────────────────────────────────────────── */
const SKILL_COLORS: Record<string, string> = {
  Novice: '#0D7377',
  Intermediate: '#F57C00',
  Advanced: '#D32F2F',
  Expert: '#8B0000',
};

const CHART_COLORS = ['#0D7377', '#F57C00', '#D32F2F', '#90A4AE', '#388E3C'];

const getMetricLabel = (metricType: string): string => {
  switch (metricType) {
    case 'attacks_detected': return 'Attacks Detected';
    case 'attackers_trapped': return 'Attackers Trapped';
    case 'environments_active': return 'Environments Active';
    default: return metricType;
  }
};

const getTimeRangeLabel = (range: string): string => {
  switch (range) {
    case '24h': return 'Last 24 Hours';
    case '7d': return 'Last 7 Days';
    case '30d': return 'Last 30 Days';
    case '90d': return 'Last 90 Days';
    default: return range;
  }
};

/* ─── Sub-components ─────────────────────────────────────────── */
function StatCard({ label, value, trend, accent }: { 
  label: string; 
  value: string | number; 
  trend?: { value: number; positive: boolean };
  accent?: string;
}) {
  return (
    <div className="px-5 py-3.5 border-r border-border last:border-r-0">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
      <p
        className="text-2xl font-black font-mono mt-0.5"
        style={accent ? { color: accent } : undefined}
      >
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      {trend && (
        <div className="flex items-center gap-1 mt-1">
          {trend.positive ? (
            <TrendingUp size={10} className="text-destructive" />
          ) : (
            <TrendingDown size={10} className="text-green-600" />
          )}
          <span className={`text-[10px] font-mono ${trend.positive ? 'text-destructive' : 'text-green-600'}`}>
            {Math.abs(trend.value)}% vs previous
          </span>
        </div>
      )}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, subtitle, color }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subtitle: string;
  color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="border border-border bg-card p-4"
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} style={{ color }} />
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      </div>
      <p className="text-2xl font-black font-mono" style={{ color }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      <p className="text-[10px] text-muted-foreground mt-1">{subtitle}</p>
    </motion.div>
  );
}

/* ─── Custom Tooltip for Charts ──────────────────────────────── */
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-card border border-border px-3 py-2 shadow-lg">
      <p className="text-[10px] font-mono text-muted-foreground mb-1">{label}</p>
      {payload.map((p: any, idx: number) => (
        <p key={idx} className="text-xs font-semibold" style={{ color: p.color || p.stroke }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

/* ─── Main Component ─────────────────────────────────────────── */
const Analytics = () => {
  const [trendsData, setTrendsData] = useState<AnalyticsTrend | null>(null);
  const [attackLocations, setAttackLocations] = useState<AttackLocation[]>([]);
  const [skillDistribution, setSkillDistribution] = useState<SkillDistribution[]>([]);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState('24h');
  const [metric, setMetric] = useState('attacks_detected');

  useEffect(() => {
    fetchAllAnalytics();
  }, [timeRange, metric]);

  const fetchAllAnalytics = async () => {
    try {
      setLoading(true);
      const [trends, locations, skills, summaryData] = await Promise.all([
        api.getAnalyticsTrends(timeRange, metric),
        api.getAttackLocations(10),
        api.getSkillDistribution(),
        api.getAnalyticsSummary(timeRange === '24h' ? 'today' : timeRange === '7d' ? 'week' : 'month'),
      ]);

      setTrendsData(trends);
      setAttackLocations(locations);
      setSkillDistribution(skills);
      setSummary(summaryData);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const [trends, locations, skills, summaryData] = await Promise.all([
        api.getAnalyticsTrends(timeRange, metric),
        api.getAttackLocations(10),
        api.getSkillDistribution(),
        api.getAnalyticsSummary(timeRange === '24h' ? 'today' : timeRange === '7d' ? 'week' : 'month'),
      ]);
      setTrendsData(trends);
      setAttackLocations(locations);
      setSkillDistribution(skills);
      setSummary(summaryData);
      toast.success('Analytics refreshed');
    } catch (error: any) {
      toast.error(error.message || 'Failed to refresh');
    } finally {
      setRefreshing(false);
    }
  };

  const chartData = trendsData?.data || [];
  const topCountries = attackLocations.slice(0, 5).map((location) => ({
    name: location.country,
    value: location.attacks,
  }));

  const skillData = skillDistribution.map((skill) => ({
    name: skill.skill_level.charAt(0).toUpperCase() + skill.skill_level.slice(1),
    value: skill.percentage,
    color: SKILL_COLORS[skill.skill_level.charAt(0).toUpperCase() + skill.skill_level.slice(1)] || CHART_COLORS[0],
  }));

  const totalActiveThreats = attackLocations.reduce((sum, loc) => sum + loc.attacks, 0);
  const detectionRate = summary && summary.total_attacks > 0
    ? Math.round((summary.total_attackers_trapped / summary.total_attacks) * 100)
    : 0;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-7 h-7 animate-spin text-primary mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Loading analytics data…</p>
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
            <h1 className="text-xl font-black uppercase tracking-tight text-foreground">Analytics Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Historical trends and statistical analysis of threat patterns
            </p>
          </div>
          <div className="flex gap-2">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="h-9 px-3 text-sm bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
              className="h-9 px-3 text-sm bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="attacks_detected">Attacks Detected</option>
              <option value="attackers_trapped">Attackers Trapped</option>
              <option value="environments_active">Environments Active</option>
            </select>
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              variant="outline"
              className="border-border text-foreground/70 hover:bg-muted h-9 px-4 text-sm font-semibold gap-2"
            >
              {refreshing ? <Loader2 size={13} className="animate-spin" /> : <Activity size={13} />}
              Refresh
            </Button>
          </div>
        </div>

        {/* ── Summary stats strip ───────────────────────────────── */}
        {summary && (
          <div className="grid grid-cols-4 border border-border mb-6">
            <StatCard
              label="Total Attacks"
              value={summary.total_attacks}
              trend={{ value: summary.attack_trend_percent, positive: summary.attack_trend_percent > 0 }}
              accent="#D32F2F"
            />
            <StatCard
              label="Attackers Trapped"
              value={summary.total_attackers_trapped}
              accent="hsl(var(--primary))"
            />
            <StatCard
              label="Avg Response Time"
              value={`${summary.avg_response_time}ms`}
              accent="#FBC02D"
            />
            <StatCard
              label="Peak Environments"
              value={summary.peak_active_environments}
              accent="#388E3C"
            />
          </div>
        )}

        {/* ── Trend Chart ───────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="border border-border bg-card mb-6 overflow-hidden"
        >
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-border bg-muted/30">
            <TrendingUp size={15} className="text-primary flex-shrink-0" />
            <span className="text-xs font-bold uppercase tracking-widest text-foreground">
              {getMetricLabel(metric)} Trends ({getTimeRangeLabel(timeRange)})
            </span>
          </div>
          <div className="px-5 py-4">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="time"
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fontSize: 10, fontFamily: 'monospace' }}
                    interval={timeRange === '24h' ? 2 : 3}
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: 10, paddingTop: 12 }}
                    formatter={(value) => <span className="text-xs text-foreground">{value}</span>}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#D32F2F"
                    strokeWidth={2}
                    dot={{ fill: '#D32F2F', r: 3 }}
                    name={getMetricLabel(metric)}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No trend data available for the selected period
              </div>
            )}
          </div>
        </motion.div>

        {/* ── Two column charts ─────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Top Attack Sources */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.3 }}
            className="border border-border bg-card overflow-hidden"
          >
            <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-border bg-muted/30">
              <Globe size={15} className="text-primary flex-shrink-0" />
              <span className="text-xs font-bold uppercase tracking-widest text-foreground">Top Attack Sources</span>
            </div>
            <div className="px-5 py-4">
              {topCountries.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topCountries} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fontSize: 10 }}
                      width={80}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="value" fill="#F57C00" name="Attack Count" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No attack location data available
                </div>
              )}
            </div>
          </motion.div>

          {/* Attacker Skill Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.3 }}
            className="border border-border bg-card overflow-hidden"
          >
            <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-border bg-muted/30">
              <Target size={15} className="text-primary flex-shrink-0" />
              <span className="text-xs font-bold uppercase tracking-widest text-foreground">Attacker Skill Distribution</span>
            </div>
            <div className="px-5 py-4">
              {skillData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={skillData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      dataKey="value"
                      stroke="none"
                    >
                      {skillData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No skill distribution data available
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* ── Metric cards ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            icon={Activity}
            label="Detection Rate"
            value={`${detectionRate}%`}
            subtitle="of attacks successfully trapped"
            color="hsl(var(--primary))"
          />
          <MetricCard
            icon={Clock}
            label="Avg Response Time"
            value={`${summary?.avg_response_time || 0}ms`}
            subtitle="average detection to response"
            color="#FBC02D"
          />
          <MetricCard
            icon={Target}
            label="Active Threats"
            value={totalActiveThreats}
            subtitle={`from ${attackLocations.length} locations`}
            color="#D32F2F"
          />
        </div>

      </div>
    </DashboardLayout>
  );
};

export default Analytics;