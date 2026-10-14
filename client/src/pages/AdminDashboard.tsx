import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import {
  Users, Globe, Shield, Activity, CreditCard, Crown,
  RefreshCw, Loader2, AlertTriangle, CheckCircle, X,
  TrendingUp, ChevronDown, Brain, Zap, Eye, EyeOff, Save,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, type SystemSettings, type GroqConnectionStatus } from '@/lib/api';

/* ─── Types ─────────────────────────────────────────────────── */
interface Overview {
  users: { total: number; admin: number; pro: number; enterprise: number; free: number; new_24h: number; new_7d: number };
  sites: { total: number; active: number; monitoring: number; paused: number };
  threats: { total: number; active: number; critical: number; last_24h: number };
  activity: { total_logs: number; flagged_logs: number; logs_24h: number; active_sessions: number };
  revenue: { total_payments: number; total_revenue_usd: number; total_revenue_kes: number; pending_payments: number };
}
interface UserRow {
  id: number; email: string; full_name: string; company_name: string;
  plan: string; is_admin: boolean; is_active: boolean; site_count: number;
  date_joined: string | null; last_login: string | null;
}
interface PaymentRow {
  id: number; user_email: string; user_name: string; plan: string;
  provider: string; amount: number; currency: string; status: string;
  checkout_id: string; created_at: string;
}
interface SiteRow {
  id: string; domain: string; owner: string; owner_email: string; status: string;
  sessions_monitored: number; threats_detected: number;
  registered_date: string | null; last_activity: string | null;
}

/* ─── Helpers ────────────────────────────────────────────────── */
const fmt = (iso: string | null) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const PLAN_COLOR: Record<string, string> = { admin: '#D32F2F', enterprise: '#7B1FA2', pro: '#0D7377', free: '#78909C' };
const STATUS_COLOR: Record<string, string> = { active: '#388E3C', monitoring: '#0D7377', paused: '#78909C', completed: '#388E3C', pending: '#F57C00', failed: '#D32F2F' };

function StatCard({ label, value, sub, accent, icon: Icon, delay = 0 }: { label: string; value: string | number; sub?: string; accent?: string; icon: any; delay?: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className="border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
        <Icon size={15} className="text-muted-foreground/50" />
      </div>
      <p className="text-3xl font-black font-mono" style={accent ? { color: accent } : undefined}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>}
    </motion.div>
  );
}

/* ─── Main ───────────────────────────────────────────────────── */
const AdminDashboard = () => {
  const { user, isAdmin } = useAuth();
  const [, setLocation] = useLocation();

  const [tab, setTab] = useState<'overview' | 'users' | 'sites' | 'payments' | 'ai'>('overview');
  const [overview, setOverview] = useState<Overview | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [sites, setSites] = useState<SiteRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editPlan, setEditPlan] = useState('');

  // AI Integration tab state
  const [aiSettings, setAiSettings] = useState<SystemSettings | null>(null);
  const [groqKeyInput, setGroqKeyInput] = useState('');
  const [showGroqKey, setShowGroqKey] = useState(false);
  const [openaiKeyInput, setOpenaiKeyInput] = useState('');
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [providerDraft, setProviderDraft] = useState<'groq' | 'openai'>('groq');
  const [modelDraft, setModelDraft] = useState('');
  const [aiSaving, setAiSaving] = useState(false);
  const [modelSaving, setModelSaving] = useState(false);
  const [aiStatus, setAiStatus] = useState<GroqConnectionStatus | null>(null);
  const [aiTesting, setAiTesting] = useState(false);

  const DEFAULT_MODEL: Record<'groq' | 'openai', string> = {
    groq: 'llama-3.3-70b-versatile',
    openai: 'gpt-4o-mini',
  };

  // Check if user is admin (using both plan and is_superuser/is_staff)
  const userIsAdmin = isAdmin || user?.plan === 'admin' || user?.is_superuser || user?.is_staff;

  if (!userIsAdmin) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <AlertTriangle size={40} className="text-destructive" />
          <p className="text-lg font-bold">Admin access required</p>
          <Button onClick={() => setLocation('/')}>Go to Dashboard</Button>
        </div>
      </DashboardLayout>
    );
  }

  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.adminGetOverview();
      setOverview(data);
    } catch (err) {
      console.error('Failed to load overview:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to load overview data');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.adminGetUsers();
      setUsers(data);
    } catch (err) {
      console.error('Failed to load users:', err);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPayments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.adminGetPayments();
      setPayments(data);
    } catch (err) {
      console.error('Failed to load payments:', err);
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSites = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.adminGetSites();
      setSites(data);
    } catch (err) {
      console.error('Failed to load sites:', err);
      toast.error('Failed to load sites');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAiSettings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getSystemSettings();
      setAiSettings(data);
      setProviderDraft((data.ai_provider as 'groq' | 'openai') || 'groq');
      setModelDraft(data.ai_model || DEFAULT_MODEL[(data.ai_provider as 'groq' | 'openai') || 'groq']);
    } catch (err) {
      console.error('Failed to load AI settings:', err);
      toast.error('Failed to load AI settings');
    } finally {
      setLoading(false);
    }
  }, []);

  const saveModelSettings = async () => {
    setModelSaving(true);
    try {
      const updated = await api.updateSystemSettings({
        ai_provider: providerDraft,
        ai_model: modelDraft.trim() || DEFAULT_MODEL[providerDraft],
      });
      setAiSettings(updated);
      setAiStatus(null);
      toast.success(`Now using ${providerDraft === 'openai' ? 'OpenAI' : 'Groq'} (${updated.ai_model}). Run "Test Connection" to confirm it works.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save model settings');
    } finally {
      setModelSaving(false);
    }
  };

  const saveOpenaiKey = async () => {
    if (!openaiKeyInput.trim()) {
      toast.error('Enter an OpenAI API key before saving.');
      return;
    }
    setAiSaving(true);
    try {
      const updated = await api.updateSystemSettings({ openai_api_key: openaiKeyInput.trim() });
      setAiSettings(updated);
      setOpenaiKeyInput('');
      toast.success('OpenAI API key saved. Run "Test Connection" to confirm it works.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save API key');
    } finally {
      setAiSaving(false);
    }
  };

  const clearOpenaiKey = async () => {
    setAiSaving(true);
    try {
      const updated = await api.updateSystemSettings({ openai_api_key: '' });
      setAiSettings(updated);
      setAiStatus(null);
      toast.success('OpenAI API key cleared. Falls back to the OPENAI_API_KEY environment variable, if set.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to clear API key');
    } finally {
      setAiSaving(false);
    }
  };

  useEffect(() => {
    if (tab === 'overview') loadOverview();
    if (tab === 'users') loadUsers();
    if (tab === 'payments') loadPayments();
    if (tab === 'sites') loadSites();
    if (tab === 'ai') { loadAiSettings(); setAiStatus(null); }
  }, [tab, loadOverview, loadUsers, loadPayments, loadSites, loadAiSettings]);

  const saveGroqKey = async () => {
    if (!groqKeyInput.trim()) {
      toast.error('Enter a Groq API key before saving.');
      return;
    }
    setAiSaving(true);
    try {
      const updated = await api.updateSystemSettings({ groq_api_key: groqKeyInput.trim() });
      setAiSettings(updated);
      setGroqKeyInput('');
      toast.success('Groq API key saved. Run "Test Connection" to confirm it works.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save API key');
    } finally {
      setAiSaving(false);
    }
  };

  const clearGroqKey = async () => {
    setAiSaving(true);
    try {
      const updated = await api.updateSystemSettings({ groq_api_key: '' });
      setAiSettings(updated);
      setAiStatus(null);
      toast.success('Groq API key cleared. The AI tier will fall back to the GROQ_API_KEY environment variable, if set.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to clear API key');
    } finally {
      setAiSaving(false);
    }
  };

  const testAiConnection = async () => {
    setAiTesting(true);
    setAiStatus(null);
    try {
      const status = await api.testGroqConnection();
      setAiStatus(status);
      if (status.connected) toast.success('Groq is active and responding.');
      else toast.error(status.message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Connection test failed');
    } finally {
      setAiTesting(false);
    }
  };

  const updateUser = async () => {
    if (!editUser) return;
    try {
      await api.adminUpdateUser(editUser.id, { plan: editPlan });
      toast.success(`${editUser.email} updated to ${editPlan}`);
      setEditUser(null);
      loadUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    }
  };

  const toggleUserActive = async (u: UserRow) => {
    try {
      await api.adminUpdateUser(u.id, { is_active: !u.is_active });
      toast.success(`${u.email} ${!u.is_active ? 'activated' : 'deactivated'}`);
      loadUsers();
    } catch (err) {
      toast.error('Failed to update user status');
    }
  };

  const TABS = ['overview', 'users', 'sites', 'payments', 'ai'] as const;
  const TAB_LABEL: Record<typeof TABS[number], string> = {
    overview: 'Overview', users: 'Users', sites: 'Sites', payments: 'Payments', ai: 'AI Integration',
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-5 border-b border-border">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Crown size={18} className="text-destructive" />
              <h1 className="text-xl font-black uppercase tracking-tight">Admin Dashboard</h1>
            </div>
            <p className="text-sm text-muted-foreground">Full platform visibility and control</p>
          </div>
          <Button variant="outline" onClick={() => {
            if (tab === 'overview') loadOverview();
            else if (tab === 'users') loadUsers();
            else if (tab === 'payments') loadPayments();
            else loadSites();
          }}
            disabled={loading} className="border-border gap-2 h-9 text-sm font-semibold">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Refresh
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border mb-6 gap-0">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2.5 text-xs font-bold uppercase tracking-widest border-b-2 transition-colors ${tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}>
              {TAB_LABEL[t]}
            </button>
          ))}
        </div>

        {/* ── Overview ─────────────────────────────────────────── */}
        {tab === 'overview' && (
          <div className="space-y-6">
            {loading && !overview ? (
              <div className="flex items-center justify-center h-40"><Loader2 size={24} className="animate-spin text-primary" /></div>
            ) : overview ? (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <StatCard label="Total Users" value={overview.users.total} sub={`+${overview.users.new_24h} today`} icon={Users} accent="hsl(var(--primary))" delay={0} />
                  <StatCard label="Registered Sites" value={overview.sites.total} sub={`${overview.sites.active} active`} icon={Globe} delay={0.04} />
                  <StatCard label="Active Threats" value={overview.threats.active} sub={`${overview.threats.last_24h} in 24h`} icon={Shield} accent="#D32F2F" delay={0.08} />
                  <StatCard label="Active Sessions" value={overview.activity.active_sessions} sub="live right now" icon={Activity} accent="#0D7377" delay={0.12} />
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <StatCard label="Revenue (USD)" value={`$${overview.revenue.total_revenue_usd.toFixed(0)}`} sub={`${overview.revenue.total_payments} payments`} icon={CreditCard} accent="#388E3C" delay={0.16} />
                  <StatCard label="Revenue (KES)" value={`KES ${overview.revenue.total_revenue_kes.toLocaleString()}`} sub="M-Pesa total" icon={CreditCard} delay={0.20} />
                  <StatCard label="Critical Threats" value={overview.threats.critical} sub="all time" icon={AlertTriangle} accent="#D32F2F" delay={0.24} />
                  <StatCard label="Flagged Logs" value={overview.activity.flagged_logs} sub={`of ${overview.activity.total_logs} total`} icon={Shield} delay={0.28} />
                </div>

                {/* Plan breakdown */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}
                  className="border border-border bg-card overflow-hidden">
                  <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-border bg-muted/30">
                    <TrendingUp size={14} className="text-primary" />
                    <span className="text-xs font-bold uppercase tracking-widest">User Plan Distribution</span>
                  </div>
                  <div className="grid grid-cols-4 divide-x divide-border">
                    {[
                      { label: 'Admin', value: overview.users.admin, color: PLAN_COLOR.admin },
                      { label: 'Enterprise', value: overview.users.enterprise, color: PLAN_COLOR.enterprise },
                      { label: 'Pro', value: overview.users.pro, color: PLAN_COLOR.pro },
                      { label: 'Free', value: overview.users.free, color: PLAN_COLOR.free },
                    ].map(p => (
                      <div key={p.label} className="px-5 py-4 text-center">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{p.label}</p>
                        <p className="text-2xl font-black font-mono" style={{ color: p.color }}>{p.value}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </>
            ) : null}
          </div>
        )}

        {/* ── Users ────────────────────────────────────────────── */}
        {tab === 'users' && (
          <div>
            {loading ? <div className="flex items-center justify-center h-40"><Loader2 size={24} className="animate-spin text-primary" /></div> : (
              <div className="border border-border overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      {['User', 'Plan', 'Sites', 'Joined', 'Last Login', 'Status', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-xs font-semibold">{u.full_name || u.email.split('@')[0]}</p>
                          <p className="text-[10px] text-muted-foreground">{u.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-sm"
                            style={{ color: PLAN_COLOR[u.plan] || '#78909C', backgroundColor: (PLAN_COLOR[u.plan] || '#78909C') + '20', border: `1px solid ${(PLAN_COLOR[u.plan] || '#78909C')}40` }}>
                            {u.plan}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono">{u.site_count}</td>
                        <td className="px-4 py-3 text-[10px] text-muted-foreground">{fmt(u.date_joined)}</td>
                        <td className="px-4 py-3 text-[10px] text-muted-foreground">{fmt(u.last_login)}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-bold ${u.is_active ? 'text-green-500' : 'text-destructive'}`}>
                            {u.is_active ? '● Active' : '○ Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <Button variant="outline" size="sm" onClick={() => { setEditUser(u); setEditPlan(u.plan); }}
                              className="h-7 px-2.5 text-[10px] border-border font-semibold">
                              Plan <ChevronDown size={10} className="ml-1" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => toggleUserActive(u)}
                              className={`h-7 px-2.5 text-[10px] font-semibold ${u.is_active ? 'border-destructive text-destructive hover:bg-destructive/10' : 'border-green-500 text-green-500 hover:bg-green-500/10'}`}>
                              {u.is_active ? 'Disable' : 'Enable'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {/* Edit plan modal */}
            {editUser && (
              <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setEditUser(null)}>
                <div className="bg-card border border-border w-full max-w-sm p-6 space-y-4" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold">Change plan for {editUser.email}</p>
                    <button onClick={() => setEditUser(null)}><X size={16} className="text-muted-foreground" /></button>
                  </div>
                  <select value={editPlan} onChange={e => setEditPlan(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border text-sm h-9 focus:outline-none">
                    {['free', 'pro', 'enterprise', 'admin'].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <Button onClick={updateUser} className="flex-1 bg-primary text-primary-foreground font-bold h-9 text-sm">Save</Button>
                    <Button variant="outline" onClick={() => setEditUser(null)} className="border-border h-9 text-sm">Cancel</Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Sites ────────────────────────────────────────────── */}
        {tab === 'sites' && (
          <div>
            {loading ? <div className="flex items-center justify-center h-40"><Loader2 size={24} className="animate-spin text-primary" /></div> : (
              <div className="border border-border overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      {['Domain', 'Owner', 'Status', 'Sessions', 'Threats', 'Registered', 'Last Activity'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {sites.map(s => (
                      <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-xs font-semibold font-mono">{s.domain}</td>
                        <td className="px-4 py-3">
                          <p className="text-xs">{s.owner}</p>
                          <p className="text-[10px] text-muted-foreground">{s.owner_email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-bold uppercase" style={{ color: STATUS_COLOR[s.status] || '#78909C' }}>
                            {s.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono">{s.sessions_monitored.toLocaleString()}</td>
                        <td className="px-4 py-3 text-xs font-mono text-destructive">{s.threats_detected}</td>
                        <td className="px-4 py-3 text-[10px] text-muted-foreground">{fmt(s.registered_date)}</td>
                        <td className="px-4 py-3 text-[10px] text-muted-foreground">{fmt(s.last_activity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Payments ─────────────────────────────────────────── */}
        {tab === 'payments' && (
          <div>
            {loading ? <div className="flex items-center justify-center h-40"><Loader2 size={24} className="animate-spin text-primary" /></div> : (
              <div className="border border-border overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      {['User', 'Plan', 'Provider', 'Amount', 'Status', 'Date'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {payments.map(p => (
                      <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-xs font-semibold">{p.user_name}</p>
                          <p className="text-[10px] text-muted-foreground">{p.user_email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-bold uppercase" style={{ color: PLAN_COLOR[p.plan] || '#78909C' }}>{p.plan}</span>
                        </td>
                        <td className="px-4 py-3 text-xs capitalize">{p.provider}</td>
                        <td className="px-4 py-3 text-xs font-mono font-bold">
                          {p.currency === 'USD' ? '$' : 'KES '}{p.amount.toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-bold uppercase" style={{ color: STATUS_COLOR[p.status] || '#78909C' }}>
                            {p.status === 'completed' ? <><CheckCircle size={10} className="inline mr-1" />Paid</> : p.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[10px] text-muted-foreground">{fmt(p.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── AI Integration ──────────────────────────────────────── */}
        {tab === 'ai' && (
          <div className="space-y-5 max-w-3xl">
            {loading && !aiSettings ? (
              <div className="flex items-center justify-center h-40"><Loader2 size={24} className="animate-spin text-primary" /></div>
            ) : (
              <>
                <div className="border border-border bg-card p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <Brain size={15} className="text-primary" />
                    <h2 className="text-sm font-bold uppercase tracking-widest">Provider &amp; Model</h2>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">
                    Switch which AI powers Tier 3 analysis, and which model from that provider — takes
                    effect on the very next AI call, no redeploy needed. Configure the matching API key
                    below for whichever provider you select.
                  </p>

                  <div className="flex gap-2 mb-3">
                    {(['groq', 'openai'] as const).map(p => (
                      <button
                        key={p}
                        onClick={() => { setProviderDraft(p); if (!modelDraft || modelDraft === DEFAULT_MODEL[providerDraft]) setModelDraft(DEFAULT_MODEL[p]); }}
                        className={`flex-1 h-9 text-xs font-bold uppercase tracking-widest border transition-colors ${
                          providerDraft === p ? 'border-primary text-primary bg-primary/8' : 'border-border text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {p === 'openai' ? 'OpenAI' : 'Groq'}
                      </button>
                    ))}
                  </div>

                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1.5">
                    Model name
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      value={modelDraft}
                      onChange={e => setModelDraft(e.target.value)}
                      placeholder={DEFAULT_MODEL[providerDraft]}
                      className="flex-1 h-9 text-xs font-mono bg-muted/20 border border-border px-3 focus:outline-none focus:border-primary/50"
                    />
                    <Button onClick={saveModelSettings} disabled={modelSaving} className="h-9 text-xs gap-1.5 flex-shrink-0">
                      {modelSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground/60 mt-1.5">
                    Currently active: <span className="font-mono text-foreground/70">{aiSettings?.ai_provider || 'groq'} / {aiSettings?.ai_model || DEFAULT_MODEL.groq}</span>.
                    Examples — Groq: llama-3.3-70b-versatile, llama-3.1-8b-instant. OpenAI: gpt-4o-mini, gpt-4o, o3-mini.
                  </p>
                </div>

                <div className="border border-border bg-card p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <Brain size={15} className="text-primary" />
                    <h2 className="text-sm font-bold uppercase tracking-widest">Groq API Key</h2>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">
                    Powers Tier 3 AI threat analysis — the deepest evaluation stage, used to reason about
                    sessions that behavioral rules (Tier 1/2) flag as ambiguous. Without a working key, the
                    platform still runs on Tier 1/2 pattern + behavioral detection alone.
                  </p>

                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Key status:</span>
                    {aiSettings?.groq_api_key_set ? (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                        <CheckCircle size={12} /> Configured in System Settings
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400">
                        <AlertTriangle size={12} /> Not set here — falling back to GROQ_API_KEY env var, if any
                      </span>
                    )}
                  </div>

                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1.5">
                    {aiSettings?.groq_api_key_set ? 'Replace key' : 'Set key'}
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showGroqKey ? 'text' : 'password'}
                        value={groqKeyInput}
                        onChange={e => setGroqKeyInput(e.target.value)}
                        placeholder="gsk_..."
                        className="w-full h-9 text-xs font-mono bg-muted/20 border border-border pl-3 pr-9 focus:outline-none focus:border-primary/50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowGroqKey(s => !s)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground"
                        tabIndex={-1}
                      >
                        {showGroqKey ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>
                    <Button onClick={saveGroqKey} disabled={aiSaving} className="h-9 text-xs gap-1.5 flex-shrink-0">
                      {aiSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground/60 mt-1.5">
                    The key is write-only once saved — it's never sent back to the browser, including here.
                    Get a key at{' '}
                    <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
                      console.groq.com/keys
                    </a>.
                  </p>

                  {aiSettings?.groq_api_key_set && (
                    <button
                      onClick={clearGroqKey}
                      disabled={aiSaving}
                      className="text-[10px] text-destructive/70 hover:text-destructive mt-3 flex items-center gap-1"
                    >
                      <X size={10} /> Clear saved key (falls back to env var)
                    </button>
                  )}
                </div>

                <div className="border border-border bg-card p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <Brain size={15} className="text-primary" />
                    <h2 className="text-sm font-bold uppercase tracking-widest">OpenAI API Key</h2>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">
                    Only used when Provider &amp; Model above is set to OpenAI.
                  </p>

                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Key status:</span>
                    {aiSettings?.openai_api_key_set ? (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                        <CheckCircle size={12} /> Configured in System Settings
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400">
                        <AlertTriangle size={12} /> Not set here — falling back to OPENAI_API_KEY env var, if any
                      </span>
                    )}
                  </div>

                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1.5">
                    {aiSettings?.openai_api_key_set ? 'Replace key' : 'Set key'}
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showOpenaiKey ? 'text' : 'password'}
                        value={openaiKeyInput}
                        onChange={e => setOpenaiKeyInput(e.target.value)}
                        placeholder="sk-..."
                        className="w-full h-9 text-xs font-mono bg-muted/20 border border-border pl-3 pr-9 focus:outline-none focus:border-primary/50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowOpenaiKey(s => !s)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground"
                        tabIndex={-1}
                      >
                        {showOpenaiKey ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>
                    <Button onClick={saveOpenaiKey} disabled={aiSaving} className="h-9 text-xs gap-1.5 flex-shrink-0">
                      {aiSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground/60 mt-1.5">
                    The key is write-only once saved — it's never sent back to the browser, including here.
                    Get a key at{' '}
                    <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
                      platform.openai.com/api-keys
                    </a>.
                  </p>

                  {aiSettings?.openai_api_key_set && (
                    <button
                      onClick={clearOpenaiKey}
                      disabled={aiSaving}
                      className="text-[10px] text-destructive/70 hover:text-destructive mt-3 flex items-center gap-1"
                    >
                      <X size={10} /> Clear saved key (falls back to env var)
                    </button>
                  )}
                </div>

                <div className="border border-border bg-card p-5">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Zap size={15} className="text-primary" />
                      <h2 className="text-sm font-bold uppercase tracking-widest">AI Status</h2>
                    </div>
                    <Button variant="outline" size="sm" onClick={testAiConnection} disabled={aiTesting} className="h-7 text-[10px] gap-1.5">
                      {aiTesting ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />} Test Connection
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">
                    Makes one real, minimal call to Groq right now — confirming the key actually works,
                    not just that one is saved.
                  </p>

                  {!aiStatus ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Activity size={13} /> Not tested yet this session — click "Test Connection."
                    </div>
                  ) : (
                    <div className={`border p-3.5 ${aiStatus.connected ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-destructive/40 bg-destructive/5'}`}>
                      <div className="flex items-center gap-2 mb-1.5">
                        {aiStatus.connected
                          ? <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          : <span className="w-2 h-2 rounded-full bg-destructive" />}
                        <span className={`text-xs font-bold uppercase tracking-widest ${aiStatus.connected ? 'text-emerald-400' : 'text-destructive'}`}>
                          {aiStatus.connected ? 'Active' : 'Inactive'}
                        </span>
                        {aiStatus.provider && <span className="text-[10px] font-mono text-muted-foreground uppercase">{aiStatus.provider}</span>}
                        {aiStatus.model && <span className="text-[10px] font-mono text-muted-foreground">{aiStatus.model}</span>}
                        {typeof aiStatus.latency_ms === 'number' && (
                          <span className="text-[10px] font-mono text-muted-foreground ml-auto">{aiStatus.latency_ms}ms</span>
                        )}
                      </div>
                      <p className="text-[11px] text-foreground/70">{aiStatus.message}</p>
                      {aiStatus.key_source && (
                        <p className="text-[10px] text-muted-foreground/60 mt-1">
                          Key source: {aiStatus.key_source === 'admin_panel' ? 'this admin panel' : 'GROQ_API_KEY environment variable'}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;