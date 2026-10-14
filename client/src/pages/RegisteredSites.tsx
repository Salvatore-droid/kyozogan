import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Plus, ExternalLink, Trash2, Edit2, Loader2, Globe, X,
  Code2, Copy, CheckCheck, ChevronDown, ChevronUp,
  ShieldCheck, ShieldAlert, RefreshCw, AlertCircle,
  Brain, Zap, Eye, AlertTriangle, Terminal, ShieldX,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, RegisteredSite, CreateSiteData, SiteProfile } from '@/lib/api';

/* ─── Types ─────────────────────────────────────────────────── */
interface Platform { id: string; label: string; steps: string[]; }
interface SnippetData {
  site_id: string; domain: string; snippet: string;
  ingest_url: string; platforms: Platform[];
}

/* ─── Helpers ─────────────────────────────────────────────────── */
const STATUS_CONFIG = {
  active:     { label: 'Active',     color: '#388E3C', bg: '#388E3C18' },
  monitoring: { label: 'Monitoring', color: '#0D7377', bg: '#0D737718' },
  paused:     { label: 'Paused',     color: '#78909C', bg: '#78909C18' },
} as const;
type SiteStatus = keyof typeof STATUS_CONFIG;

const fmt = (d: string) => {
  const date = new Date(d);
  return (
    date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' · ' + date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  );
};

function StatCell({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="px-4 py-3">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
      <p className="text-lg font-black font-mono leading-none" style={accent ? { color: accent } : undefined}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
      {children}
    </label>
  );
}

const PLATFORM_COLORS: Record<string, string> = {
  wordpress: '#21759B', shopify: '#96BF48', webflow: '#4353FF',
  squarespace: '#555', wix: '#FAAD4D', html: '#E44D26',
  react: '#61DAFB', vue: '#42B883', other: '#78909C',
};

/* ─── AI Profile Panel ────────────────────────────────────────── */
function AIProfilePanel({ site }: { site: RegisteredSite }) {
  const [open, setOpen]         = useState(false);
  const [profile, setProfile]   = useState<SiteProfile | null>(null);
  const [loading, setLoading]   = useState(false);
  const [profiling, setProfiling] = useState(false);

  const load = useCallback(async () => {
    if (!open) {
      if (!profile) {
        setLoading(true);
        try {
          const p = await api.getSiteProfile(site.id);
          setProfile(p);
        } catch { /* ignore */ }
        finally { setLoading(false); }
      }
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [open, profile, site.id]);

  const triggerProfile = async () => {
    setProfiling(true);
    setProfile(prev => prev ? { ...prev, status: 'profiling' } : { site_id: site.id, domain: site.domain, status: 'profiling' });
    try {
      toast.info('AI is reading your site — this takes 10–20 seconds…');
      const result = await api.triggerSiteProfile(site.id);
      setProfile(result as SiteProfile);
      if ((result as SiteProfile).status === 'ready') {
        toast.success('Site profiled — AI now understands this site\'s normal behaviour');
      } else {
        toast.error('Profiling failed — check the site is reachable');
      }
    } catch (e: any) {
      toast.error(e.message || 'Profiling failed');
      setProfile(prev => prev ? { ...prev, status: 'failed' } : null);
    } finally {
      setProfiling(false);
    }
  };

  const statusDot = () => {
    if (!profile || profile.status === 'not_started' || profile.status === 'pending')
      return <span className="w-2 h-2 rounded-full bg-muted-foreground/40 inline-block" />;
    if (profile.status === 'profiling')
      return <Loader2 size={10} className="animate-spin text-primary" />;
    if (profile.status === 'ready')
      return <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />;
    return <span className="w-2 h-2 rounded-full bg-destructive inline-block" />;
  };

  return (
    <div className="border-t border-border/60">
      <button
        onClick={load}
        className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-primary/80 hover:bg-primary/5 transition-colors"
      >
        <span className="flex items-center gap-2">
          <Brain size={13} />
          AI Behaviour Profile
          <span className="flex items-center gap-1 ml-1">{statusDot()}</span>
        </span>
        {loading
          ? <Loader2 size={12} className="animate-spin" />
          : open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-5 space-y-4">
              {(!profile || profile.status === 'not_started' || profile.status === 'pending') && (
                <div className="text-center py-4">
                  <Brain size={28} className="mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground mb-3">
                    The AI hasn't read this site yet. Once profiled, it understands what the site
                    does and uses that to detect suspicious sessions — not just known attack patterns.
                  </p>
                  <Button onClick={triggerProfile} disabled={profiling}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold h-8 px-4 text-xs gap-2">
                    {profiling ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                    Profile This Site
                  </Button>
                </div>
              )}

              {profile?.status === 'profiling' && (
                <div className="text-center py-4">
                  <Loader2 size={24} className="animate-spin mx-auto mb-2 text-primary" />
                  <p className="text-xs text-muted-foreground">
                    AI is crawling and analysing {site.domain}…
                  </p>
                </div>
              )}

              {profile?.status === 'failed' && (
                <div className="space-y-3">
                  <div className="flex items-start gap-2 p-3 bg-destructive/5 border border-destructive/20">
                    <AlertCircle size={13} className="text-destructive mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-destructive">Profiling failed</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{profile.crawl_error || 'Could not reach the site'}</p>
                    </div>
                  </div>
                  <Button onClick={triggerProfile} disabled={profiling} variant="outline"
                    className="border-border h-8 px-4 text-xs font-semibold gap-2">
                    <RefreshCw size={12} /> Retry Profiling
                  </Button>
                </div>
              )}

              {profile?.status === 'ready' && (
                <div className="space-y-4">
                  {/* Purpose */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
                      Site Purpose
                    </p>
                    <p className="text-xs text-foreground/80 leading-relaxed">{profile.site_purpose}</p>
                    <span className="inline-block mt-1.5 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 border border-primary/30 text-primary bg-primary/5">
                      {profile.site_type}
                    </span>
                  </div>

                  {/* Normal behaviour */}
                  {profile.normal_actions && profile.normal_actions.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 flex items-center gap-1.5">
                        <Eye size={10} /> Normal User Actions
                      </p>
                      <ul className="space-y-1">
                        {profile.normal_actions.map((a, i) => (
                          <li key={i} className="text-[11px] text-foreground/70 flex items-start gap-1.5">
                            <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span> {a}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Suspicious signals */}
                  {profile.suspicious_signals && profile.suspicious_signals.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 flex items-center gap-1.5">
                        <AlertTriangle size={10} /> Site-Specific Suspicious Signals
                      </p>
                      <ul className="space-y-1">
                        {profile.suspicious_signals.map((s, i) => (
                          <li key={i} className="text-[11px] text-foreground/70 flex items-start gap-1.5">
                            <span className="text-amber-500 mt-0.5 flex-shrink-0">⚠</span> {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Sensitive areas */}
                  {profile.sensitive_areas && profile.sensitive_areas.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 flex items-center gap-1.5">
                        <ShieldAlert size={10} /> Sensitive Areas (Never for Regular Users)
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {profile.sensitive_areas.map((s, i) => (
                          <span key={i} className="text-[10px] font-mono px-1.5 py-0.5 bg-destructive/8 border border-destructive/20 text-destructive/80">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <p className="text-[10px] text-muted-foreground">
                      {profile.pages_crawled} page{profile.pages_crawled !== 1 ? 's' : ''} crawled
                      {profile.updated_at ? ` · updated ${fmt(profile.updated_at)}` : ''}
                    </p>
                    <Button onClick={triggerProfile} disabled={profiling} variant="outline"
                      className="border-border h-7 px-3 text-[10px] font-semibold gap-1.5">
                      <RefreshCw size={10} /> Re-profile
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Snippet / Installation Panel ───────────────────────────── */
function SnippetPanel({ site }: { site: RegisteredSite }) {
  const [open, setOpen]               = useState(false);
  const [data, setData]               = useState<SnippetData | null>(null);
  const [loadingSnippet, setLoading]  = useState(false);
  const [copied, setCopied]           = useState(false);
  const [platform, setPlatform]       = useState('');
  const [verifying, setVerifying]     = useState(false);
  const [verified, setVerified]       = useState<boolean | null>(null);
  const [verifyError, setVerifyError] = useState('');

  // Server-side SDK (the thing that actually sees SQLi/command-injection/
  // SSTI/etc. — the JS snippet above only sees browser-rendered behavior)
  const [sdkOpen, setSdkOpen]         = useState(false);
  const [sdkData, setSdkData]         = useState<Awaited<ReturnType<typeof api.getSdkConfig>> | null>(null);
  const [sdkLoading, setSdkLoading]   = useState(false);
  const [sdkLang, setSdkLang]         = useState<'flask' | 'django_settings' | 'express'>('flask');
  const [sdkCopied, setSdkCopied]     = useState(false);

  const loadSdk = async () => {
    if (sdkData) { setSdkOpen(v => !v); return; }
    setSdkLoading(true);
    try {
      const res = await api.getSdkConfig(site.id);
      setSdkData(res);
      setSdkOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load SDK config');
    } finally {
      setSdkLoading(false);
    }
  };

  const copySdk = async () => {
    if (!sdkData) return;
    await navigator.clipboard.writeText(sdkData.usage[sdkLang]);
    setSdkCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setSdkCopied(false), 2500);
  };

  const load = useCallback(async () => {
    if (data) { setOpen(v => !v); return; }
    setLoading(true);
    try {
      const res = await api.getSnippet(site.id);
      setData(res);
      setPlatform(res.platforms[0]?.id ?? 'html');
      setOpen(true);
    } catch { toast.error('Failed to load snippet'); }
    finally { setLoading(false); }
  }, [data, site.id]);

  const copy = async () => {
    const activePlatform = data?.platforms.find(p => p.id === platform);
    const snippetToCopy  = (activePlatform as any)?.snippet ?? data?.snippet ?? '';
    if (!snippetToCopy) return;
    await navigator.clipboard.writeText(snippetToCopy);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2500);
  };

  const verify = async () => {
    setVerifying(true); setVerified(null); setVerifyError('');
    try {
      const res = await api.verifySnippet(site.id);
      setVerified(res.installed);
      if (res.error) setVerifyError(res.error);
      res.installed
        ? toast.success('Snippet detected — protection is live!')
        : toast.error('Snippet not found on the site yet');
    } catch { setVerifyError('Verification request failed'); }
    finally { setVerifying(false); }
  };

  const activePlatform = data?.platforms.find(p => p.id === platform);
  const displaySnippet = (activePlatform as any)?.snippet ?? data?.snippet ?? '';

  return (
    <div className="border-t border-border/60">
      <button
        onClick={load}
        className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-primary/80 hover:bg-primary/5 transition-colors"
      >
        <span className="flex items-center gap-2"><Code2 size={13} /> Installation Guide</span>
        {loadingSnippet
          ? <Loader2 size={12} className="animate-spin" />
          : open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>

      <AnimatePresence>
        {open && data && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-5 space-y-5">
              {/* Platform selector */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                  1 — What platform is your site on?
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {data.platforms.map(p => (
                    <button key={p.id} onClick={() => setPlatform(p.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 border text-[11px] font-semibold transition-colors ${
                        platform === p.id
                          ? 'border-primary/50 bg-primary/8 text-primary'
                          : 'border-border text-foreground/60 hover:border-muted-foreground/40 hover:text-foreground'
                      }`}>
                      <span className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: PLATFORM_COLORS[p.id] ?? '#78909C' }} />
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Steps */}
              {activePlatform && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                    2 — Steps for {activePlatform.label}
                  </p>
                  <ol className="space-y-2">
                    {activePlatform.steps.map((step, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-[11px] text-foreground/80 leading-relaxed">
                        <span className="flex-shrink-0 w-4 h-4 mt-0.5 flex items-center justify-center border border-border text-[9px] font-bold text-muted-foreground">
                          {i + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Snippet */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                  3 — Copy this snippet
                </p>
                <div className="relative bg-background border border-border overflow-x-auto">
                  <pre className="px-4 py-3 text-[10px] font-mono text-foreground/80 leading-relaxed whitespace-pre pr-20">
                    {displaySnippet}
                  </pre>
                  <button onClick={copy}
                    className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-1.5 bg-muted border border-border text-[10px] font-bold uppercase tracking-widest hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-colors">
                    {copied ? <><CheckCheck size={10} /> Copied</> : <><Copy size={10} /> Copy</>}
                  </button>
                </div>
              </div>

              {/* Verify */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                  4 — Verify it's working
                </p>
                <p className="text-[10px] text-muted-foreground mb-2.5">
                  After pasting and publishing, click below to confirm the script is active.
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  <Button onClick={verify} disabled={verifying} variant="outline"
                    className="border-border text-foreground/70 hover:bg-muted h-8 px-4 text-xs font-semibold gap-2">
                    {verifying ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                    Check Installation
                  </Button>
                  {verified === true && (
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: '#388E3C' }}>
                      <ShieldCheck size={13} /> Active — protection is live
                    </span>
                  )}
                  {verified === false && !verifyError && (
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-600">
                      <ShieldAlert size={13} /> Snippet not detected yet
                    </span>
                  )}
                  {verifyError && (
                    <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <AlertCircle size={11} /> {verifyError}
                    </span>
                  )}
                </div>
              </div>

              {/* ── Server-side SDK — the part that actually sees attacks ── */}
              <div className="border border-amber-500/30 bg-amber-500/5 -mx-4 px-4 py-4">
                <div className="flex items-start gap-2 mb-2.5">
                  <ShieldX size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[11px] font-bold text-amber-200">
                      The snippet above alone will not catch SQL injection, command injection, SSTI, or
                      other server-side attacks.
                    </p>
                    <p className="text-[10px] text-amber-100/70 mt-1 leading-relaxed">
                      It's client-side JavaScript — it only sees what happens in a rendered browser page.
                      A payload sent directly to your backend (curl, sqlmap, Postman, a scanner) never
                      executes JavaScript, so this snippet never sees it, and nothing gets evaluated or
                      flagged. To actually intercept and evaluate real requests server-side, install the
                      matching SDK below in your backend.
                    </p>
                  </div>
                </div>

                <button
                  onClick={loadSdk}
                  className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-semibold text-amber-200 hover:bg-amber-500/10 transition-colors border border-amber-500/30 mt-1"
                >
                  <span className="flex items-center gap-2"><Terminal size={12} /> 5 — Install the server-side SDK (required for real attack detection)</span>
                  {sdkLoading
                    ? <Loader2 size={12} className="animate-spin" />
                    : sdkOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>

                <AnimatePresence>
                  {sdkOpen && sdkData && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-3 space-y-3">
                        <div className="flex flex-wrap gap-1.5">
                          {([
                            { id: 'flask' as const, label: 'Flask' },
                            { id: 'django_settings' as const, label: 'Django' },
                            { id: 'express' as const, label: 'Express' },
                          ]).map(l => (
                            <button key={l.id} onClick={() => setSdkLang(l.id)}
                              className={`px-2.5 py-1.5 border text-[11px] font-semibold transition-colors ${
                                sdkLang === l.id
                                  ? 'border-primary/50 bg-primary/8 text-primary'
                                  : 'border-border text-foreground/60 hover:border-muted-foreground/40 hover:text-foreground'
                              }`}>
                              {l.label}
                            </button>
                          ))}
                        </div>

                        <div className="relative bg-background border border-border overflow-x-auto">
                          <pre className="px-4 py-3 text-[10px] font-mono text-foreground/80 leading-relaxed whitespace-pre pr-20">
                            {sdkData.usage[sdkLang]}
                          </pre>
                          <button onClick={copySdk}
                            className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-1.5 bg-muted border border-border text-[10px] font-bold uppercase tracking-widest hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-colors">
                            {sdkCopied ? <><CheckCheck size={10} /> Copied</> : <><Copy size={10} /> Copy</>}
                          </button>
                        </div>

                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                          {sdkLang === 'flask' && 'pip install the genius_mirage_sdk package (or copy flask_sdk.py into your project), then run this once when your Flask app is created — before any routes are registered, so every request gets evaluated.'}
                          {sdkLang === 'django_settings' && 'Add genius_mirage_sdk.django_sdk.GeniusMirageMiddleware to your MIDDLEWARE list, then set these three values in settings.py.'}
                          {sdkLang === 'express' && 'npm install / copy the express_sdk.js file, then app.use() it before your route handlers so every request passes through evaluation first.'}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Main Page ───────────────────────────────────────────────── */
const RegisteredSites = () => {
  const [sites, setSites]             = useState<RegisteredSite[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showNewSite, setShowNewSite] = useState(false);
  const [editingSite, setEditingSite] = useState<RegisteredSite | null>(null);
  const [newSite, setNewSite]         = useState<CreateSiteData>({ domain: '', owner: '' });
  const [submitting, setSubmitting]   = useState(false);
  const [newlyAdded, setNewlyAdded]   = useState<string | null>(null);

  useEffect(() => { fetchSites(); }, []);

  const fetchSites = async () => {
    try { setLoading(true); setSites(await api.getSites()); }
    catch (e: any) { toast.error(e.message || 'Failed to load sites'); }
    finally { setLoading(false); }
  };

  const handleAddSite = async () => {
    if (!newSite.domain || !newSite.owner) { toast.error('Please fill in all fields'); return; }
    setSubmitting(true);
    try {
      const created = await api.createSite(newSite);
      setSites([created, ...sites]);
      setNewSite({ domain: '', owner: '' });
      setShowNewSite(false);
      setNewlyAdded(created.id);
      toast.success('Site registered — AI is now profiling it in the background');
    } catch (e: any) { toast.error(e.message || 'Failed to register site'); }
    finally { setSubmitting(false); }
  };

  const handleUpdateSite = async () => {
    if (!editingSite) return;
    setSubmitting(true);
    try {
      const updated = await api.updateSite(editingSite.id, {
        domain: editingSite.domain, owner: editingSite.owner, status: editingSite.status,
      });
      setSites(sites.map(s => s.id === updated.id ? updated : s));
      setEditingSite(null);
      toast.success('Site updated');
    } catch (e: any) { toast.error(e.message || 'Failed to update site'); }
    finally { setSubmitting(false); }
  };

  const handleDeleteSite = async (id: string) => {
    if (!confirm('Delete this site? This cannot be undone.')) return;
    try {
      await api.deleteSite(id);
      setSites(sites.filter(s => s.id !== id));
      if (newlyAdded === id) setNewlyAdded(null);
      toast.success('Site deleted');
    } catch (e: any) { toast.error(e.message || 'Failed to delete site'); }
  };

  if (loading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-7 h-7 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading sites…</p>
        </div>
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-6 pb-5 border-b border-border">
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight text-foreground">Registered Sites</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Websites protected by the Genius Mirage deception system
            </p>
          </div>
          <Button onClick={() => { setShowNewSite(!showNewSite); setEditingSite(null); }} disabled={submitting}
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold h-9 px-4 text-sm flex items-center gap-2">
            <Plus size={15} /> Register Site
          </Button>
        </div>

        {/* Summary strip */}
        {sites.length > 0 && (
          <div className="grid grid-cols-3 border border-border mb-6">
            {[
              { label: 'Total Sites',   value: sites.length },
              { label: 'Active',        value: sites.filter(s => s.status === 'active').length },
              { label: 'Total Threats', value: sites.reduce((a, s) => a + s.threats_detected, 0) },
            ].map((stat, i) => (
              <div key={i} className={`px-5 py-3.5 ${i < 2 ? 'border-r border-border' : ''}`}>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-black font-mono text-foreground mt-0.5">{stat.value.toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}

        {/* New site form */}
        <AnimatePresence>
          {showNewSite && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
              className="border border-primary/50 bg-card mb-6 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-primary/5">
                <span className="text-xs font-bold uppercase tracking-widest text-primary">Register New Site</span>
                <button onClick={() => setShowNewSite(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X size={15} />
                </button>
              </div>
              <div className="px-5 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <FieldLabel>Domain</FieldLabel>
                    <Input placeholder="example.com" value={newSite.domain}
                      onChange={e => setNewSite({ ...newSite, domain: e.target.value })}
                      className="bg-background border-border text-foreground h-9 text-sm" disabled={submitting} />
                    <p className="text-[10px] text-muted-foreground mt-1">Without https:// — e.g. example.com</p>
                  </div>
                  <div>
                    <FieldLabel>Owner Name</FieldLabel>
                    <Input placeholder="Your Name" value={newSite.owner}
                      onChange={e => setNewSite({ ...newSite, owner: e.target.value })}
                      className="bg-background border-border text-foreground h-9 text-sm" disabled={submitting} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddSite} disabled={submitting}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold h-9 px-5 text-sm">
                    {submitting ? <Loader2 size={14} className="animate-spin mr-2" /> : <Plus size={14} className="mr-2" />}
                    Register
                  </Button>
                  <Button onClick={() => setShowNewSite(false)} variant="outline" disabled={submitting}
                    className="border-border text-foreground/70 hover:bg-muted h-9 px-5 text-sm">
                    Cancel
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {sites.length === 0 ? (
          <div className="border border-border bg-card py-20 text-center">
            <Globe size={32} className="mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-sm font-semibold text-foreground mb-1">No sites registered yet</p>
            <p className="text-xs text-muted-foreground mb-5">Add your first domain to start monitoring</p>
            <Button onClick={() => setShowNewSite(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold h-9 px-5 text-sm">
              <Plus size={14} className="mr-2" /> Register Site
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {sites.map((site, idx) => {
              const status = STATUS_CONFIG[site.status as SiteStatus] ?? STATUS_CONFIG.paused;
              return (
                <motion.div key={site.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className={`border bg-card overflow-hidden transition-colors duration-500 ${
                    newlyAdded === site.id ? 'border-primary/50' : 'border-border'
                  }`}>

                  {/* Card header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Globe size={14} className="text-primary flex-shrink-0" />
                      <span className="text-sm font-bold text-foreground truncate">{site.domain}</span>
                      <a href={`https://${site.domain}`} target="_blank" rel="noopener noreferrer"
                        className="text-muted-foreground/50 hover:text-primary transition-colors flex-shrink-0">
                        <ExternalLink size={13} />
                      </a>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 border flex-shrink-0"
                      style={{ color: status.color, borderColor: status.color, backgroundColor: status.bg }}>
                      {status.label}
                    </span>
                  </div>

                  {/* Owner */}
                  <div className="px-4 py-2.5 border-b border-border/60 flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground uppercase tracking-widest">Owner</span>
                    <span className="text-xs font-semibold text-foreground">{site.owner}</span>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 divide-x divide-border border-b border-border">
                    <StatCell label="Sessions Monitored" value={site.sessions_monitored} accent="hsl(var(--primary))" />
                    <StatCell label="Threats Detected" value={site.threats_detected} accent="hsl(var(--destructive))" />
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 divide-x divide-border border-b border-border">
                    <div className="px-4 py-2.5">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Registered</p>
                      <p className="text-[11px] font-mono text-foreground/70">{fmt(site.registered_date)}</p>
                    </div>
                    <div className="px-4 py-2.5">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Last Activity</p>
                      <p className="text-[11px] font-mono text-foreground/70">{fmt(site.last_activity)}</p>
                    </div>
                  </div>

                  {/* AI Profile Panel */}
                  <AIProfilePanel site={site} />

                  {/* Installation Guide */}
                  <SnippetPanel site={site} />

                  {/* Actions */}
                  <div className="flex divide-x divide-border border-t border-border">
                    <button onClick={() => { setEditingSite(site); setShowNewSite(false); }}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold text-foreground/60 hover:bg-muted hover:text-foreground transition-colors">
                      <Edit2 size={13} /> Edit
                    </button>
                    <button onClick={() => handleDeleteSite(site.id)}
                      className="flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold text-destructive/70 hover:bg-destructive/10 hover:text-destructive transition-colors">
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Edit modal */}
        <AnimatePresence>
          {editingSite && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
              onClick={() => setEditingSite(null)}>
              <motion.div initial={{ opacity: 0, scale: 0.97, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: 8 }} transition={{ duration: 0.18 }}
                className="bg-card border border-border w-full max-w-md overflow-hidden"
                onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/30">
                  <span className="text-xs font-bold uppercase tracking-widest text-foreground">Edit Site</span>
                  <button onClick={() => setEditingSite(null)} className="text-muted-foreground hover:text-foreground transition-colors">
                    <X size={15} />
                  </button>
                </div>
                <div className="px-5 py-5 space-y-4">
                  <div>
                    <FieldLabel>Domain</FieldLabel>
                    <Input value={editingSite.domain}
                      onChange={e => setEditingSite({ ...editingSite, domain: e.target.value })}
                      className="bg-background border-border text-foreground h-9 text-sm" />
                  </div>
                  <div>
                    <FieldLabel>Owner</FieldLabel>
                    <Input value={editingSite.owner}
                      onChange={e => setEditingSite({ ...editingSite, owner: e.target.value })}
                      className="bg-background border-border text-foreground h-9 text-sm" />
                  </div>
                  <div>
                    <FieldLabel>Status</FieldLabel>
                    <select value={editingSite.status}
                      onChange={e => setEditingSite({ ...editingSite, status: e.target.value as any })}
                      className="w-full px-3 py-2 bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary h-9">
                      <option value="active">Active</option>
                      <option value="monitoring">Monitoring</option>
                      <option value="paused">Paused</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 px-5 pb-5">
                  <Button onClick={handleUpdateSite} disabled={submitting}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold h-9 px-5 text-sm">
                    {submitting ? <Loader2 size={14} className="animate-spin mr-2" /> : <Edit2 size={14} className="mr-2" />}
                    Save Changes
                  </Button>
                  <Button onClick={() => setEditingSite(null)} variant="outline"
                    className="border-border text-foreground/70 hover:bg-muted h-9 px-5 text-sm">
                    Cancel
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </DashboardLayout>
  );
};

export default RegisteredSites;
