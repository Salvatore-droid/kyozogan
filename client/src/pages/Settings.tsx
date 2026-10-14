import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Loader2, Save, RotateCcw, History, Bell, Shield,
  Database, Users, Settings as SettingsIcon, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, SystemSettings, UserPreferences } from '@/lib/api';

/* ─── Types ─────────────────────────────────────────────────── */
type Tab = 'system' | 'preferences' | 'audit';

interface SectionNavItem {
  id: Tab;
  label: string;
  description: string;
  icon: React.ElementType;
}

const navItems: SectionNavItem[] = [
  { id: 'system',      label: 'System Settings',  description: 'Core configuration & thresholds', icon: SettingsIcon },
  { id: 'preferences', label: 'User Preferences', description: 'Notifications & display options',  icon: Users },
  { id: 'audit',       label: 'Audit Log',         description: 'Change history & activity trail',  icon: History },
];

/* ─── Sub-components ─────────────────────────────────────────── */
function SectionCard({ title, icon: Icon, delay = 0, children }: {
  title: string;
  icon: React.ElementType;
  delay?: number;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="border border-border bg-card mb-4 overflow-hidden"
    >
      {/* Card header */}
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-border bg-muted/30">
        <Icon size={15} className="text-primary flex-shrink-0" />
        <span className="text-xs font-bold uppercase tracking-widest text-foreground">{title}</span>
      </div>
      {/* Card body */}
      <div className="px-5 py-4 space-y-5">
        {children}
      </div>
    </motion.div>
  );
}

function FieldRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground leading-tight">{label}</p>
        {hint && <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{hint}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function InputField({ label, hint, ...props }: { label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
        {label}
      </label>
      <Input {...props} className="bg-background border-border text-foreground h-9 text-sm" />
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────── */
const Settings = () => {
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    suspicion_threshold: 65,
    auto_engagement_enabled: true,
    learning_mode: true,
    deception_level: 'advanced',
    session_timeout: 30,
    max_concurrent_sessions: 100,
    data_logging_enabled: true,
    alert_notifications: true,
  });

  const [userPreferences, setUserPreferences] = useState<UserPreferences>({
    email_notifications: true,
    desktop_notifications: true,
    threat_alerts: true,
    default_dashboard_view: 'overview',
    auto_refresh_interval: 30,
    theme: 'dark',
    compact_view: false,
  });

  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [activeTab, setActiveTab]   = useState<Tab>('system');
  const [auditLogs, setAuditLogs]   = useState<any[]>([]);

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const [system, preferences] = await Promise.all([
        api.getSystemSettings(),
        api.getUserPreferences(),
      ]);
      setSystemSettings(system);
      setUserPreferences(preferences);
      try {
        const logs = await api.getSettingsAuditLog(20);
        setAuditLogs(logs);
      } catch { /* audit log not available */ }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSystemSettingChange = (key: keyof SystemSettings, value: any) =>
    setSystemSettings(prev => ({ ...prev, [key]: value }));

  const handlePreferenceChange = (key: keyof UserPreferences, value: any) =>
    setUserPreferences(prev => ({ ...prev, [key]: value }));

  const handleSaveSystemSettings = async () => {
    setSaving(true);
    try {
      const updated = await api.updateSystemSettings(systemSettings);
      setSystemSettings(updated);
      toast.success('System settings saved');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save system settings');
    } finally { setSaving(false); }
  };

  const handleSavePreferences = async () => {
    setSaving(true);
    try {
      const updated = await api.updateUserPreferences(userPreferences);
      setUserPreferences(updated);
      toast.success('Preferences saved');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save preferences');
    } finally { setSaving(false); }
  };

  const handleResetSettings = async () => {
    if (!confirm('Reset all system settings to defaults? This cannot be undone.')) return;
    setSaving(true);
    try {
      await api.resetSystemSettings();
      const refreshed = await api.getSystemSettings();
      setSystemSettings(refreshed);
      toast.success('Settings reset to defaults');
    } catch (error: any) {
      toast.error(error.message || 'Failed to reset settings');
    } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-7 h-7 animate-spin text-primary mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Loading settings…</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">

        {/* ── Page header ───────────────────────────────────────── */}
        <div className="mb-6 pb-5 border-b border-border">
          <h1 className="text-xl font-black uppercase tracking-tight text-foreground">Configuration</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage system parameters, preferences, and audit history
          </p>
        </div>

        {/* ── Two-column layout ─────────────────────────────────── */}
        <div className="flex gap-6">

          {/* Left — section nav */}
          <div className="w-52 flex-shrink-0">
            <nav className="sticky top-6 space-y-0.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full text-left px-3 py-2.5 transition-all duration-150 relative group ${
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-foreground/70 hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary" />
                    )}
                    <div className="flex items-center gap-2.5">
                      <Icon size={15} className={isActive ? 'text-primary' : 'text-foreground/50 group-hover:text-foreground/70'} />
                      <div>
                        <p className="text-[13px] font-semibold leading-tight">{item.label}</p>
                        <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{item.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right — content */}
          <div className="flex-1 min-w-0">

            {/* ── System Settings ──────────────────────────────── */}
            {activeTab === 'system' && (
              <>
                <SectionCard title="Threat Detection" icon={Shield} delay={0}>
                  <InputField
                    label="Suspicion Threshold (%)"
                    hint="Sessions scoring above this value are routed to the deceptive backend"
                    type="number"
                    min="0"
                    max="100"
                    value={systemSettings.suspicion_threshold}
                    onChange={(e) => handleSystemSettingChange('suspicion_threshold', parseInt(e.target.value))}
                  />
                </SectionCard>

                <SectionCard title="Engagement & Learning" icon={Bell} delay={0.05}>
                  <FieldRow label="Auto Engagement" hint="Automatically engage flagged attackers without manual intervention">
                    <Switch
                      checked={systemSettings.auto_engagement_enabled}
                      onCheckedChange={(v) => handleSystemSettingChange('auto_engagement_enabled', v)}
                    />
                  </FieldRow>
                  <div className="h-px bg-border" />
                  <FieldRow label="Learning Mode" hint="Collect and analyse attack patterns to improve detection accuracy">
                    <Switch
                      checked={systemSettings.learning_mode}
                      onCheckedChange={(v) => handleSystemSettingChange('learning_mode', v)}
                    />
                  </FieldRow>
                  <div className="h-px bg-border" />
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
                      Deception Level
                    </label>
                    <select
                      value={systemSettings.deception_level}
                      onChange={(e) => handleSystemSettingChange('deception_level', e.target.value as any)}
                      className="w-full px-3 py-2 bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="basic">Basic — Simple responses</option>
                      <option value="intermediate">Intermediate — Realistic data</option>
                      <option value="advanced">Advanced — Full environment simulation</option>
                    </select>
                  </div>
                </SectionCard>

                <SectionCard title="Session Management" icon={Users} delay={0.1}>
                  <div className="grid grid-cols-2 gap-4">
                    <InputField
                      label="Session Timeout (min)"
                      type="number"
                      min="1"
                      max="1440"
                      value={systemSettings.session_timeout}
                      onChange={(e) => handleSystemSettingChange('session_timeout', parseInt(e.target.value))}
                    />
                    <InputField
                      label="Max Concurrent Sessions"
                      type="number"
                      min="1"
                      max="10000"
                      value={systemSettings.max_concurrent_sessions}
                      onChange={(e) => handleSystemSettingChange('max_concurrent_sessions', parseInt(e.target.value))}
                    />
                  </div>
                </SectionCard>

                <SectionCard title="Data & Logging" icon={Database} delay={0.15}>
                  <FieldRow label="Data Logging" hint="Log all deception interactions for forensic analysis">
                    <Switch
                      checked={systemSettings.data_logging_enabled}
                      onCheckedChange={(v) => handleSystemSettingChange('data_logging_enabled', v)}
                    />
                  </FieldRow>
                  <div className="h-px bg-border" />
                  <FieldRow label="Alert Notifications" hint="Receive real-time alerts for critical threat events">
                    <Switch
                      checked={systemSettings.alert_notifications}
                      onCheckedChange={(v) => handleSystemSettingChange('alert_notifications', v)}
                    />
                  </FieldRow>
                </SectionCard>

                {/* System actions */}
                <div className="flex items-center gap-3 pt-2">
                  <Button
                    onClick={handleSaveSystemSettings}
                    disabled={saving}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold h-9 px-5 text-sm"
                  >
                    {saving ? <Loader2 size={14} className="animate-spin mr-2" /> : <Save size={14} className="mr-2" />}
                    Save Settings
                  </Button>
                  <Button
                    onClick={handleResetSettings}
                    variant="outline"
                    disabled={saving}
                    className="border-border text-foreground/70 hover:bg-muted h-9 px-5 text-sm"
                  >
                    <RotateCcw size={14} className="mr-2" />
                    Reset to Defaults
                  </Button>
                </div>
              </>
            )}

            {/* ── User Preferences ─────────────────────────────── */}
            {activeTab === 'preferences' && (
              <>
                <SectionCard title="Notifications" icon={Bell} delay={0}>
                  <FieldRow label="Email Notifications" hint="Receive email alerts for important system events">
                    <Switch
                      checked={userPreferences.email_notifications}
                      onCheckedChange={(v) => handlePreferenceChange('email_notifications', v)}
                    />
                  </FieldRow>
                  <div className="h-px bg-border" />
                  <FieldRow label="Desktop Notifications" hint="Show browser notifications for real-time alerts">
                    <Switch
                      checked={userPreferences.desktop_notifications}
                      onCheckedChange={(v) => handlePreferenceChange('desktop_notifications', v)}
                    />
                  </FieldRow>
                  <div className="h-px bg-border" />
                  <FieldRow label="Threat Alerts" hint="Push immediate alerts when threats are detected">
                    <Switch
                      checked={userPreferences.threat_alerts}
                      onCheckedChange={(v) => handlePreferenceChange('threat_alerts', v)}
                    />
                  </FieldRow>
                </SectionCard>

                <SectionCard title="Display" icon={SettingsIcon} delay={0.05}>
                  <FieldRow label="Compact View" hint="Reduce padding and spacing across all dashboard panels">
                    <Switch
                      checked={userPreferences.compact_view}
                      onCheckedChange={(v) => handlePreferenceChange('compact_view', v)}
                    />
                  </FieldRow>
                  <div className="h-px bg-border" />
                  <InputField
                    label="Auto-Refresh Interval (seconds)"
                    hint="How often live data panels automatically reload"
                    type="number"
                    min="5"
                    max="300"
                    value={userPreferences.auto_refresh_interval}
                    onChange={(e) => handlePreferenceChange('auto_refresh_interval', parseInt(e.target.value))}
                  />
                </SectionCard>

                <div className="flex items-center gap-3 pt-2">
                  <Button
                    onClick={handleSavePreferences}
                    disabled={saving}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold h-9 px-5 text-sm"
                  >
                    {saving ? <Loader2 size={14} className="animate-spin mr-2" /> : <Save size={14} className="mr-2" />}
                    Save Preferences
                  </Button>
                </div>
              </>
            )}

            {/* ── Audit Log ────────────────────────────────────── */}
            {activeTab === 'audit' && (
              <SectionCard title="Settings Audit Log" icon={History} delay={0}>
                {auditLogs.length === 0 ? (
                  <div className="py-10 text-center">
                    <History size={28} className="mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">No audit records available</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      Changes to settings will appear here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-0 divide-y divide-border">
                    {auditLogs.map((log, i) => (
                      <motion.div
                        key={log.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                        className="py-3 flex items-start justify-between gap-4"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-primary">{log.user_email}</span>
                              <span className="text-xs text-muted-foreground">{log.action}</span>
                              <code className="text-[10px] bg-muted px-1.5 py-0.5 text-foreground/70 font-mono">
                                {log.setting_key}
                              </code>
                            </div>
                            {(log.old_value || log.new_value) && (
                              <div className="text-xs font-mono mt-1 flex items-center gap-2">
                                {log.old_value && <span className="text-muted-foreground">{log.old_value}</span>}
                                {log.old_value && log.new_value && (
                                  <ChevronRight size={12} className="text-muted-foreground/50" />
                                )}
                                {log.new_value && <span className="text-primary font-semibold">{log.new_value}</span>}
                              </div>
                            )}
                          </div>
                        </div>
                        <span className="text-[10px] text-muted-foreground flex-shrink-0 pt-0.5">{log.timestamp}</span>
                      </motion.div>
                    ))}
                  </div>
                )}
              </SectionCard>
            )}

          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;