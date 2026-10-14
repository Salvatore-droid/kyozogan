const BASE_URL = 'http://localhost:8000/api';

// ── Token helpers - FIXED to handle both key names ──────────────────────────────
export const getAccessToken = () => localStorage.getItem('access') || localStorage.getItem('access_token');
export const getRefreshToken = () => localStorage.getItem('refresh_token') || localStorage.getItem('refresh');
export const getUser = () => {
  const u = localStorage.getItem('user');
  return u ? JSON.parse(u) : null;
};

export const saveTokens = (access: string, refresh: string) => {
  localStorage.setItem('access', access);
  localStorage.setItem('access_token', access); // Store both for compatibility
  localStorage.setItem('refresh_token', refresh);
  localStorage.setItem('refresh', refresh);
};

export const clearAuth = () => {
  localStorage.removeItem('access');
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
};

export const isAuthenticated = () => !!getAccessToken();

export interface RegisteredSite {
  id: string;
  domain: string;
  owner: string;
  registered_date: string;
  status: 'active' | 'monitoring' | 'paused';
  sessions_monitored: number;
  threats_detected: number;
  last_activity: string;
}

export interface CreateSiteData {
  domain: string;
  owner: string;
  status?: 'active' | 'monitoring' | 'paused';
}

export interface SiteProfile {
  site_id: string;
  domain: string;
  status: 'not_started' | 'pending' | 'profiling' | 'ready' | 'failed';
  site_purpose?: string;
  site_type?: string;
  expected_paths?: string[];
  normal_actions?: string[];
  suspicious_signals?: string[];
  sensitive_areas?: string[];
  pages_crawled?: number;
  crawl_error?: string;
  updated_at?: string;
}

export interface SessionAIAnalysis {
  risk_score: number;
  threat_level: 'low' | 'medium' | 'high' | 'critical';
  flagged: boolean;
  techniques: string[];
  explanation: string;
  deception_strategy: 'monitor' | 'lure' | 'isolate' | 'contain';
  confidence: number;
  ai_powered: boolean;
  error?: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  domain: string;
  session_id: string;
  ip_address: string;
  user_agent: string;
  endpoint: string;
  method: string;
  status_code: number;
  response_time: number;
  suspicion_score: number;
  flagged: boolean;
  site?: string;
}

export interface ActivityLogSummary {
  total_logs: number;
  flagged_logs: number;
  avg_suspicion_score: number;
  domain_stats: Array<{
    domain: string;
    count: number;
    avg_suspicion: number;
    flagged_count: number;
  }>;
  recent_flagged: ActivityLog[];
}

export interface Threat {
  id: string;
  timestamp: string;
  domain: string;
  session_id: string;
  ip_address: string;
  threat_type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  indicators: string[];
  status: 'active' | 'contained' | 'resolved';
  description: string;
  site?: string;
  activity_log?: string;
}

export interface ThreatSummary {
  total_threats: number;
  active_threats: number;
  contained_threats: number;
  resolved_threats: number;
  severity_stats: Array<{
    severity: string;
    count: number;
  }>;
  domain_stats: Array<{
    domain: string;
    count: number;
    active_count: number;
  }>;
  recent_threats: Threat[];
}


export interface ActiveSession {
  id: string;
  domain: string;
  session_id: string;
  ip_address: string;
  start_time: string;
  last_activity: string;
  backend_type: 'real' | 'deceptive';
  threat_level: 'low' | 'medium' | 'high' | 'critical';
  interaction_count: number;
  engagement_status: 'learning' | 'deceiving' | 'analyzing';
  detected_techniques: string[];
  is_active: boolean;
  duration_minutes: number;
  site?: string;
  threat?: string;
  swap_approved?: boolean;
}

export interface ActiveSessionSummary {
  total_sessions: number;
  deceptive_sessions: number;
  real_sessions: number;
  threat_stats: Array<{
    threat_level: string;
    count: number;
  }>;
  engagement_stats: Array<{
    engagement_status: string;
    count: number;
  }>;
  most_active: ActiveSession[];
  avg_interactions: number;
}


export interface AttackPattern {
  id: string;
  technique: string;
  category: string;
  frequency: number;
  last_seen: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  indicators: string[];
  mitre_id?: string;
  detection_count: number;
  sites_affected: number;
}

export interface PatternLearningData {
  timestamp: string;
  new_patterns: number;
  repeating_patterns: number;
  total_patterns: number;
}

export interface AttackPatternSummary {
  total_patterns: number;
  total_detections: number;
  critical_patterns: number;
  high_patterns: number;
  category_stats: Array<{
    category: string;
    count: number;
    total_frequency: number;
  }>;
  severity_stats: Array<{
    severity: string;
    count: number;
    total_frequency: number;
  }>;
  most_frequent: AttackPattern[];
  recent_patterns: AttackPattern[];
}

export interface SystemSettings {
  id?: number;
  suspicion_threshold: number;
  auto_engagement_enabled: boolean;
  learning_mode: boolean;
  deception_level: 'basic' | 'intermediate' | 'advanced';
  session_timeout: number;
  max_concurrent_sessions: number;
  data_logging_enabled: boolean;
  alert_notifications: boolean;
  retention_days?: number;
  max_log_size_mb?: number;
  email_alerts?: boolean;
  webhook_url?: string;
  // Write-only on the wire — sending a new value overwrites the stored key,
  // GET never returns the actual key back (see groq_api_key_set below).
  groq_api_key?: string;
  // Read-only. True if a key is currently stored in System Settings
  // (independent of whether it's actually valid — see testGroqConnection).
  groq_api_key_set?: boolean;
  ai_provider?: 'groq' | 'openai';
  ai_model?: string;
  openai_api_key?: string;    // write-only, same pattern as groq_api_key
  openai_api_key_set?: boolean;
}

export interface GroqConnectionStatus {
  connected: boolean;
  configured: boolean;
  provider?: 'groq' | 'openai';
  model?: string;
  latency_ms?: number;
  key_source?: 'admin_panel' | 'environment_variable';
  message: string;
}

export interface UserPreferences {
  id?: number;
  email_notifications: boolean;
  desktop_notifications: boolean;
  threat_alerts: boolean;
  default_dashboard_view: string;
  auto_refresh_interval: number;
  theme: string;
  compact_view: boolean;
}

export interface SettingsAuditLog {
  id: string;
  user_email: string;
  action: string;
  setting_key: string;
  old_value: string;
  new_value: string;
  timestamp: string;
}


export interface ThreatIntelligence {
  id: string;
  timestamp: string;
  description: string;
  risk_score: number;
  status: 'new' | 'analyzed' | 'mitigated' | 'false_positive';
  source: 'internal_scan' | 'honeypot' | 'deceptive_backend' | 'threat_intel_feed' | 'community_sharing';
  payload?: string;
  tool_signature?: string;
  technique?: string;
  mitre_attack_id?: string;
  indicators: string[];
  affected_site?: string;
  affected_site_domain?: string;
  threat?: string;
  is_shared: boolean;
  shared_at?: string;
}

export interface ThreatIntelligenceStats {
  total_entries: number;
  avg_risk_score: number;
  high_risk_count: number;
  source_stats: Array<{
    source: string;
    count: number;
    avg_risk: number;
  }>;
  status_stats: Array<{
    status: string;
    count: number;
  }>;
  technique_stats: Array<{
    technique: string;
    count: number;
    avg_risk: number;
  }>;
  recent_high_risk: ThreatIntelligence[];
}

export interface AnalyticsTrend {
  metric: string;
  time_range: string;
  data: Array<{
    time: string;
    value: number;
  }>;
}

export interface AttackLocation {
  id: string;
  country: string;
  country_code: string;
  attacks: number;
  latitude?: number;
  longitude?: number;
  last_seen: string;
}

export interface SkillDistribution {
  id: string;
  skill_level: string;
  percentage: number;
  total_count: number;
  updated_at: string;
}

export interface AnalyticsSummary {
  total_attacks: number;
  total_attackers_trapped: number;
  avg_response_time: number;
  peak_active_environments: number;
  attack_trend_percent: number;
  time_range: string;
}

export interface HistoricalSnapshot {
  date: string;
  total_attacks: number;
  total_attackers_trapped: number;
  avg_response_time: number;
  avg_deception_time: number;
  peak_active_environments: number;
  unique_attackers: number;
}


export interface AttackerProfile {
  id: string;
  fingerprint: string;
  country: string;
  country_code?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  ip_address: string;
  asn?: string;
  isp?: string;
  skill_level: 'novice' | 'intermediate' | 'advanced' | 'expert';
  status: 'active' | 'idle' | 'trapped' | 'evaded';
  time_in_environment: number;
  total_interactions: number;
  avg_response_time: number;
  techniques: string[];
  first_seen: string;
  last_activity: string;
  total_sessions: number;
  behavior_summary: string;
  threat_score: number;
  deception_susceptibility: number;
  preferred_targets: string[];
  notes?: string;
  tags?: string[];
}

export interface AttackerBehaviorLog {
  id: string;
  behavior_type: string;
  description: string;
  technique?: string;
  endpoint: string;
  payload?: string;
  response_time: number;
  success: boolean;
  deception_triggered: boolean;
  timestamp: string;
}

export interface AttackerSummary {
  total_attackers: number;
  active_attackers: number;
  trapped_attackers: number;
  avg_threat_score: number;
  skill_stats: Array<{
    skill_level: string;
    count: number;
  }>;
  country_stats: Array<{
    country: string;
    count: number;
    avg_threat: number;
  }>;
  recent_attackers: AttackerProfile[];
}

export interface DeceptionEnvironment {
  id: string;
  name: string;
  type: string;
  type_display: string;
  status: 'active' | 'under_attack' | 'compromised' | 'idle' | 'maintenance';
  status_display: string;
  description: string;
  attacker_count: number;
  total_interactions: number;
  ai_adaptation_level: number;
  honeypots: number;
  deception_level: string;
  response_delay_ms: number;
  error_rate: number;
  fake_data_volume: 'low' | 'medium' | 'high';
  behavioral_patterns: any;
  allowed_techniques: string[];
  blocked_techniques: string[];
  last_triggered: string;
  created_at: string;
  site?: string;
  network_segment?: string;
  access_controls?: any;
}

export interface DeceptionInteraction {
  id: string;
  request_path: string;
  request_method: string;
  request_headers: any;
  request_body?: string;
  response_status: number;
  response_body?: string;
  response_time_ms: number;
  was_deceptive: boolean;
  triggered_alert: boolean;
  technique_detected?: string;
  timestamp: string;
}

export interface EnvironmentSummary {
  total_environments: number;
  active_environments: number;
  under_attack: number;
  compromised: number;
  total_attackers_trapped: number;
  total_interactions: number;
  avg_ai_adaptation: number;
  recent_deployments: number;
  type_stats: Array<{
    type: string;
    count: number;
    total_attackers: number;
  }>;
}

// ── Auto-refresh token ─────────────────────────────────────────────────────────
const refreshAccessToken = async (): Promise<boolean> => {
  const refresh = getRefreshToken();
  if (!refresh) return false;
  try {
    const res = await fetch(`${BASE_URL}/auth/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });
    if (res.ok) {
      const data = await res.json();
      const newAccess = data.access || data.access_token;
      if (newAccess) {
        localStorage.setItem('access', newAccess);
        localStorage.setItem('access_token', newAccess);
      }
      return true;
    }
  } catch {}
  return false;
};

// ── Authenticated fetch wrapper ────────────────────────────────────────────────
export const authFetch = async (url: string, options: RequestInit = {}) => {
  // Accept either an absolute URL or a path like "/api/...". A bare path
  // resolves against whatever origin the page itself is served from (the
  // Vite dev server, typically a different port than the Django backend),
  // silently hitting the wrong server instead of the API — which then
  // fails in a way that looks identical to "no data" or "backend down."
  // Resolving relative paths against BASE_URL here closes that off for
  // every caller, not just ones that remember to prefix it themselves.
  const resolvedUrl = /^https?:\/\//i.test(url) ? url : `${BASE_URL}${url.startsWith('/api') ? url.slice(4) : url}`;

  const makeRequest = (token: string | null) =>
    fetch(resolvedUrl, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });

  let res = await makeRequest(getAccessToken());

  if (res.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      res = await makeRequest(getAccessToken());
    } else {
      clearAuth();
      window.location.href = '/login';
    }
  }

  return res;
};

export interface CodeScanFinding {
  index: number;
  rule_id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  file: string;
  line: number;
  snippet: string;
  description: string;
  recommendation: string;
}

export interface CodeScanReport {
  files_scanned: number;
  truncated: boolean;
  errors: string[];
  summary: Record<'critical' | 'high' | 'medium' | 'low' | 'info', number>;
  findings: CodeScanFinding[];
}

export interface CodeScanResult {
  scan_id: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  original_filename?: string;
  created_at?: string;
  completed_at?: string | null;
  error_message?: string;
  report: CodeScanReport;
}

export interface RemediationSuggestion {
  suggestion_id: number;
  scan_id: number;
  rule_id: string;
  file: string;
  line: number;
  finding_title: string;
  status: 'pending' | 'approved' | 'rejected' | 'failed';
  diff_text: string;
  explanation: string;
  error_message: string;
  created_at: string;
  decided_at: string | null;
}

export interface CodeScanSummary {
  scan_id: number;
  original_filename: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  summary: Partial<Record<'critical' | 'high' | 'medium' | 'low' | 'info', number>>;
}

// ── Automated Pentester ─────────────────────────────────────────────────────
export const api = {
  authFetch,
  uploadCodeScan: async (
    file: File,
    opts: { siteId?: string; consentStatement: string },
  ): Promise<CodeScanResult> => {
    const form = new FormData();
    form.append('file', file);
    form.append('user_consented', 'true');
    form.append('consent_statement', opts.consentStatement);
    if (opts.siteId) form.append('site_id', opts.siteId);

    // Deliberately NOT using authFetch here — it force-sets
    // Content-Type: application/json, which would strip the multipart
    // boundary the browser needs to set for FormData uploads.
    const doUpload = (token: string | null) =>
      fetch(`${BASE_URL}/pentester/scan/`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });

    let res = await doUpload(getAccessToken());
    if (res.status === 401) {
      const refreshed = await refreshAccessToken();
      res = refreshed ? await doUpload(getAccessToken()) : res;
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Scan failed to complete.');
    }
    return data;
  },

  getCodeScan: async (scanId: number): Promise<CodeScanResult> => {
    const res = await authFetch(`${BASE_URL}/pentester/scan/${scanId}/`);
    if (!res.ok) throw new Error('Failed to fetch scan.');
    return res.json();
  },

  listCodeScans: async (): Promise<CodeScanSummary[]> => {
    const res = await authFetch(`${BASE_URL}/pentester/scans/`);
    if (!res.ok) throw new Error('Failed to fetch scan history.');
    return res.json();
  },

  generateRemediation: async (scanId: number, findingIndex: number): Promise<RemediationSuggestion> => {
    const res = await authFetch(`${BASE_URL}/pentester/scan/${scanId}/findings/${findingIndex}/remediate/`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to generate a fix.');
    return data;
  },

  approveRemediation: async (suggestionId: number): Promise<RemediationSuggestion> => {
    const res = await authFetch(`${BASE_URL}/pentester/remediation/${suggestionId}/approve/`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to approve fix.');
    return data;
  },

  rejectRemediation: async (suggestionId: number): Promise<RemediationSuggestion> => {
    const res = await authFetch(`${BASE_URL}/pentester/remediation/${suggestionId}/reject/`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to reject fix.');
    return data;
  },

  listRemediations: async (scanId: number): Promise<RemediationSuggestion[]> => {
    const res = await authFetch(`${BASE_URL}/pentester/scan/${scanId}/remediations/`);
    if (!res.ok) throw new Error('Failed to fetch remediation history.');
    return res.json();
  },

  downloadRemediatedScan: async (scanId: number, filename: string): Promise<void> => {
    const res = await authFetch(`${BASE_URL}/pentester/scan/${scanId}/download/`);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to download remediated codebase.');
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },

  register: async (payload: {
    email: string;
    full_name?: string;
    company_name?: string;
    password: string;
    confirmPassword: string;
  }) => {
    const requestBody = {
      email: payload.email,
      full_name: payload.full_name || '',
      company_name: payload.company_name || '',
      password: payload.password,
      confirmPassword: payload.confirmPassword,
    };
    
    console.log('Register request body:', requestBody);
    
    const res = await fetch(`${BASE_URL}/auth/register/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
    const data = await res.json();
    
    if (res.ok && data.access) {
      saveTokens(data.access, data.refresh);
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }
    }
    
    console.log('Register response:', { ok: res.ok, status: res.status, data });
    return { ok: res.ok, status: res.status, data };
  },

  login: async (email: string, password: string) => {
    const res = await fetch(`${BASE_URL}/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    });
    const data = await res.json();
    
    if (res.ok && data.access) {
      saveTokens(data.access, data.refresh);
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }
    }
    
    console.log('Login response:', { ok: res.ok, status: res.status, data });
    return { ok: res.ok, status: res.status, data };
  },

  logout: async (refreshToken?: string) => {
    const refresh = refreshToken || getRefreshToken();
    try {
      const res = await fetch(`${BASE_URL}/auth/logout/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh }),
      });
      const data = await res.json();
      console.log('Logout response:', data);
      return data;
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAuth();
    }
  },

  me: async () => {
    try {
      const res = await authFetch(`${BASE_URL}/auth/me/`);
      if (res.ok) {
        const data = await res.json();
        console.log('Me response:', data);
        return data;
      }
      return null;
    } catch (error) {
      console.error('Me error:', error);
      return null;
    }
  },

  getSites: async (): Promise<RegisteredSite[]> => {
    const res = await authFetch(`${BASE_URL}/auth/sites/`);
    if (res.ok) {
      return await res.json();
    }
    throw new Error('Failed to fetch sites');
  },
  
  createSite: async (data: CreateSiteData): Promise<RegisteredSite> => {
    const res = await authFetch(`${BASE_URL}/auth/sites/`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.ok) {
      return await res.json();
    }
    const error = await res.json();
    throw new Error(error.domain?.[0] || error.owner?.[0] || 'Failed to create site');
  },
  
  updateSite: async (siteId: string, data: Partial<CreateSiteData>): Promise<RegisteredSite> => {
    const res = await authFetch(`${BASE_URL}/auth/sites/${siteId}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (res.ok) {
      return await res.json();
    }
    throw new Error('Failed to update site');
  },
  
  deleteSite: async (siteId: string): Promise<void> => {
    const res = await authFetch(`${BASE_URL}/auth/sites/${siteId}/`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      throw new Error('Failed to delete site');
    }
  },
  
  updateSiteMetrics: async (siteId: string, sessions: number, threats: number): Promise<RegisteredSite> => {
    const res = await authFetch(`${BASE_URL}/auth/sites/${siteId}/metrics/`, {
      method: 'POST',
      body: JSON.stringify({ sessions_monitored: sessions, threats_detected: threats }),
    });
    if (res.ok) {
      return await res.json();
    }
    throw new Error('Failed to update metrics');
  },

  getActivityLogs: async (filters?: {
    domain?: string;
    ip_address?: string;
    session_id?: string;
    flagged?: boolean;
    limit?: number;
  }): Promise<ActivityLog[]> => {
    const queryParams = new URLSearchParams();
    if (filters?.domain) queryParams.append('domain', filters.domain);
    if (filters?.ip_address) queryParams.append('ip_address', filters.ip_address);
    if (filters?.session_id) queryParams.append('session_id', filters.session_id);
    if (filters?.flagged !== undefined) queryParams.append('flagged', String(filters.flagged));
    if (filters?.limit) queryParams.append('limit', String(filters.limit));
    
    const url = `${BASE_URL}/auth/activity-logs/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const res = await authFetch(url);
    if (res.ok) {
      return await res.json();
    }
    throw new Error('Failed to fetch activity logs');
  },
  
  createActivityLog: async (log: Omit<ActivityLog, 'id' | 'timestamp'>): Promise<ActivityLog> => {
    const res = await authFetch(`${BASE_URL}/auth/activity-logs/`, {
      method: 'POST',
      body: JSON.stringify(log),
    });
    if (res.ok) {
      return await res.json();
    }
    const error = await res.json();
    throw new Error(error.error || 'Failed to create activity log');
  },
  
  getActivityLogsSummary: async (): Promise<ActivityLogSummary> => {
    const res = await authFetch(`${BASE_URL}/auth/activity-logs/summary/`);
    if (res.ok) {
      return await res.json();
    }
    throw new Error('Failed to fetch activity logs summary');
  },
  
  deleteActivityLog: async (logId: string): Promise<void> => {
    const res = await authFetch(`${BASE_URL}/auth/activity-logs/${logId}/`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      throw new Error('Failed to delete activity log');
    }
  },

  getThreats: async (filters?: {
    domain?: string;
    severity?: string;
    status?: string;
    session_id?: string;
    limit?: number;
  }): Promise<Threat[]> => {
    const queryParams = new URLSearchParams();
    if (filters?.domain) queryParams.append('domain', filters.domain);
    if (filters?.severity) queryParams.append('severity', filters.severity);
    if (filters?.status) queryParams.append('status', filters.status);
    if (filters?.session_id) queryParams.append('session_id', filters.session_id);
    if (filters?.limit) queryParams.append('limit', String(filters.limit));
    
    const url = `${BASE_URL}/auth/threats/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const res = await authFetch(url);
    if (res.ok) {
      return await res.json();
    }
    throw new Error('Failed to fetch threats');
  },
  
  createThreat: async (threat: Omit<Threat, 'id' | 'timestamp'>): Promise<Threat> => {
    const res = await authFetch(`${BASE_URL}/auth/threats/`, {
      method: 'POST',
      body: JSON.stringify(threat),
    });
    if (res.ok) {
      return await res.json();
    }
    const error = await res.json();
    throw new Error(error.error || 'Failed to create threat');
  },
  
  updateThreat: async (threatId: string, data: Partial<Threat>): Promise<Threat> => {
    const res = await authFetch(`${BASE_URL}/auth/threats/${threatId}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (res.ok) {
      return await res.json();
    }
    throw new Error('Failed to update threat');
  },
  
  updateThreatStatus: async (threatId: string, status: string): Promise<Threat> => {
    const res = await authFetch(`${BASE_URL}/auth/threats/${threatId}/status/`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      return await res.json();
    }
    throw new Error('Failed to update threat status');
  },
  
  deleteThreat: async (threatId: string): Promise<void> => {
    const res = await authFetch(`${BASE_URL}/auth/threats/${threatId}/`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      throw new Error('Failed to delete threat');
    }
  },
  
  getThreatsSummary: async (): Promise<ThreatSummary> => {
    const res = await authFetch(`${BASE_URL}/auth/threats/summary/`);
    if (res.ok) {
      return await res.json();
    }
    throw new Error('Failed to fetch threats summary');
  },

  getActiveSessions: async (filters?: {
    domain?: string;
    backend_type?: string;
    threat_level?: string;
    engagement_status?: string;
    limit?: number;
  }): Promise<ActiveSession[]> => {
    const queryParams = new URLSearchParams();
    if (filters?.domain) queryParams.append('domain', filters.domain);
    if (filters?.backend_type) queryParams.append('backend_type', filters.backend_type);
    if (filters?.threat_level) queryParams.append('threat_level', filters.threat_level);
    if (filters?.engagement_status) queryParams.append('engagement_status', filters.engagement_status);
    if (filters?.limit) queryParams.append('limit', String(filters.limit));
    
    const url = `${BASE_URL}/auth/active-sessions/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const res = await authFetch(url);
    if (res.ok) {
      return await res.json();
    }
    throw new Error('Failed to fetch active sessions');
  },
  
  createActiveSession: async (session: Omit<ActiveSession, 'id' | 'start_time' | 'last_activity' | 'duration_minutes' | 'is_active'>): Promise<ActiveSession> => {
    const res = await authFetch(`${BASE_URL}/auth/active-sessions/`, {
      method: 'POST',
      body: JSON.stringify(session),
    });
    if (res.ok) {
      return await res.json();
    }
    const error = await res.json();
    throw new Error(error.error || 'Failed to create session');
  },
  
  updateSessionInteraction: async (sessionId: string, data: {
    interaction_count?: number;
    detected_techniques?: string[];
    threat_level?: string;
    engagement_status?: string;
  }): Promise<ActiveSession> => {
    const res = await authFetch(`${BASE_URL}/auth/active-sessions/${sessionId}/interact/`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.ok) {
      return await res.json();
    }
    throw new Error('Failed to update session interaction');
  },
  
  terminateSession: async (sessionId: string): Promise<void> => {
    const res = await authFetch(`${BASE_URL}/auth/active-sessions/${sessionId}/`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      throw new Error('Failed to terminate session');
    }
  },

  approveSwap: async (sessionId: string): Promise<{ swap_approved: boolean; message: string }> => {
    const res = await authFetch(`${BASE_URL}/auth/active-sessions/${sessionId}/approve-swap/`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to approve swap');
    return res.json();
  },

  revokeSwap: async (sessionId: string): Promise<{ swap_approved: boolean }> => {
    const res = await authFetch(`${BASE_URL}/auth/active-sessions/${sessionId}/revoke-swap/`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to revoke swap');
    return res.json();
  },
  
  getActiveSessionsSummary: async (): Promise<ActiveSessionSummary> => {
    const res = await authFetch(`${BASE_URL}/auth/active-sessions/summary/`);
    if (res.ok) {
      return await res.json();
    }
    throw new Error('Failed to fetch active sessions summary');
  },

  getAttackPatterns: async (filters?: {
    category?: string;
    severity?: string;
    search?: string;
    limit?: number;
  }): Promise<AttackPattern[]> => {
    const queryParams = new URLSearchParams();
    if (filters?.category) queryParams.append('category', filters.category);
    if (filters?.severity) queryParams.append('severity', filters.severity);
    if (filters?.search) queryParams.append('search', filters.search);
    if (filters?.limit) queryParams.append('limit', String(filters.limit));
    
    const url = `${BASE_URL}/auth/attack-patterns/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const res = await authFetch(url);
    if (res.ok) {
      return await res.json();
    }
    throw new Error('Failed to fetch attack patterns');
  },
  
  createAttackPattern: async (pattern: Omit<AttackPattern, 'id' | 'frequency' | 'last_seen' | 'detection_count' | 'sites_affected'>): Promise<AttackPattern> => {
    const res = await authFetch(`${BASE_URL}/auth/attack-patterns/`, {
      method: 'POST',
      body: JSON.stringify(pattern),
    });
    if (res.ok) {
      return await res.json();
    }
    const error = await res.json();
    throw new Error(error.error || 'Failed to create attack pattern');
  },
  
  updateAttackPattern: async (patternId: string, data: Partial<AttackPattern>): Promise<AttackPattern> => {
    const res = await authFetch(`${BASE_URL}/auth/attack-patterns/${patternId}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (res.ok) {
      return await res.json();
    }
    throw new Error('Failed to update attack pattern');
  },
  
  deleteAttackPattern: async (patternId: string): Promise<void> => {
    const res = await authFetch(`${BASE_URL}/auth/attack-patterns/${patternId}/`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      throw new Error('Failed to delete attack pattern');
    }
  },
  
  getAttackPatternsSummary: async (): Promise<AttackPatternSummary> => {
    const res = await authFetch(`${BASE_URL}/auth/attack-patterns/summary/`);
    if (res.ok) {
      return await res.json();
    }
    throw new Error('Failed to fetch attack patterns summary');
  },
  
  getPatternLearningTrends: async (hours: number = 24): Promise<PatternLearningData[]> => {
    const res = await authFetch(`${BASE_URL}/auth/attack-patterns/trends/?hours=${hours}`);
    if (res.ok) {
      return await res.json();
    }
    throw new Error('Failed to fetch learning trends');
  },
  
  updatePatternLearning: async (newPatterns: number, repeatingPatterns: number): Promise<void> => {
    const res = await authFetch(`${BASE_URL}/auth/attack-patterns/update-learning/`, {
      method: 'POST',
      body: JSON.stringify({ new_patterns: newPatterns, repeating_patterns: repeatingPatterns }),
    });
    if (!res.ok) {
      throw new Error('Failed to update learning data');
    }
  },

  getSystemSettings: async (): Promise<SystemSettings> => {
    const res = await authFetch(`${BASE_URL}/auth/settings/system/`);
    if (res.ok) {
      return await res.json();
    }
    throw new Error('Failed to fetch system settings');
  },
  
  updateSystemSettings: async (settings: Partial<SystemSettings>): Promise<SystemSettings> => {
    const res = await authFetch(`${BASE_URL}/auth/settings/system/`, {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
    if (res.ok) {
      return await res.json();
    }
    const error = await res.json();
    throw new Error(error.error || 'Failed to update system settings');
  },

  testGroqConnection: async (): Promise<GroqConnectionStatus> => {
    const res = await authFetch(`${BASE_URL}/auth/settings/system/test-ai/`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to test AI connection');
    return data;
  },

  getUserPreferences: async (): Promise<UserPreferences> => {
    const res = await authFetch(`${BASE_URL}/auth/settings/preferences/`);
    if (res.ok) {
      return await res.json();
    }
    throw new Error('Failed to fetch user preferences');
  },
  
  updateUserPreferences: async (preferences: Partial<UserPreferences>): Promise<UserPreferences> => {
    const res = await authFetch(`${BASE_URL}/auth/settings/preferences/`, {
      method: 'PUT',
      body: JSON.stringify(preferences),
    });
    if (res.ok) {
      return await res.json();
    }
    throw new Error('Failed to update user preferences');
  },
  
  resetSystemSettings: async (): Promise<void> => {
    const res = await authFetch(`${BASE_URL}/auth/settings/reset/`, {
      method: 'POST',
    });
    if (!res.ok) {
      throw new Error('Failed to reset system settings');
    }
  },
  
  getSettingsAuditLog: async (limit: number = 50): Promise<SettingsAuditLog[]> => {
    const res = await authFetch(`${BASE_URL}/auth/settings/audit-log/?limit=${limit}`);
    if (res.ok) {
      return await res.json();
    }
    throw new Error('Failed to fetch audit log');
  },

  getThreatIntelligence: async (filters?: {
    source?: string;
    status?: string;
    min_risk?: number;
    technique?: string;
    limit?: number;
  }): Promise<ThreatIntelligence[]> => {
    const queryParams = new URLSearchParams();
    if (filters?.source) queryParams.append('source', filters.source);
    if (filters?.status) queryParams.append('status', filters.status);
    if (filters?.min_risk) queryParams.append('min_risk', String(filters.min_risk));
    if (filters?.technique) queryParams.append('technique', filters.technique);
    if (filters?.limit) queryParams.append('limit', String(filters.limit));
    
    const url = `${BASE_URL}/auth/threat-intel/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const res = await authFetch(url);
    if (res.ok) {
      return await res.json();
    }
    throw new Error('Failed to fetch threat intelligence');
  },
  
  createThreatIntelligence: async (intel: Omit<ThreatIntelligence, 'id' | 'timestamp' | 'is_shared' | 'shared_at' | 'affected_site_domain'>): Promise<ThreatIntelligence> => {
    const res = await authFetch(`${BASE_URL}/auth/threat-intel/`, {
      method: 'POST',
      body: JSON.stringify(intel),
    });
    if (res.ok) {
      return await res.json();
    }
    const error = await res.json();
    throw new Error(error.error || 'Failed to create threat intelligence');
  },
  
  updateThreatIntelligence: async (intelId: string, data: Partial<ThreatIntelligence>): Promise<ThreatIntelligence> => {
    const res = await authFetch(`${BASE_URL}/auth/threat-intel/${intelId}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (res.ok) {
      return await res.json();
    }
    throw new Error('Failed to update threat intelligence');
  },
  
  deleteThreatIntelligence: async (intelId: string): Promise<void> => {
    const res = await authFetch(`${BASE_URL}/auth/threat-intel/${intelId}/`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      throw new Error('Failed to delete threat intelligence');
    }
  },
  
  getThreatIntelligenceStats: async (): Promise<ThreatIntelligenceStats> => {
    const res = await authFetch(`${BASE_URL}/auth/threat-intel/stats/`);
    if (res.ok) {
      return await res.json();
    }
    throw new Error('Failed to fetch threat intelligence stats');
  },
  
  shareThreatIntelligence: async (intelId: string, shareTo: string): Promise<void> => {
    const res = await authFetch(`${BASE_URL}/auth/threat-intel/${intelId}/share/`, {
      method: 'POST',
      body: JSON.stringify({ share_to: shareTo }),
    });
    if (!res.ok) {
      throw new Error('Failed to share threat intelligence');
    }
  },
  
  getThreatIntelligenceFeed: async (lastId?: string, limit: number = 50): Promise<ThreatIntelligence[]> => {
    const queryParams = new URLSearchParams();
    if (lastId) queryParams.append('last_id', lastId);
    queryParams.append('limit', String(limit));
    
    const res = await authFetch(`${BASE_URL}/auth/threat-intel/feed/?${queryParams.toString()}`);
    if (res.ok) {
      return await res.json();
    }
    throw new Error('Failed to fetch threat intelligence feed');
  },

  getAnalyticsTrends: async (range: string = '24h', metric: string = 'attacks_detected'): Promise<AnalyticsTrend> => {
    const res = await authFetch(`${BASE_URL}/auth/analytics/trends/?range=${range}&metric=${metric}`);
    if (res.ok) {
      return await res.json();
    }
    throw new Error('Failed to fetch analytics trends');
  },
  
  getAttackLocations: async (limit: number = 10): Promise<AttackLocation[]> => {
    const res = await authFetch(`${BASE_URL}/auth/analytics/attack-locations/?limit=${limit}`);
    if (res.ok) {
      return await res.json();
    }
    throw new Error('Failed to fetch attack locations');
  },
  
  getSkillDistribution: async (): Promise<SkillDistribution[]> => {
    const res = await authFetch(`${BASE_URL}/auth/analytics/skill-distribution/`);
    if (res.ok) {
      return await res.json();
    }
    throw new Error('Failed to fetch skill distribution');
  },
  
  getAnalyticsSummary: async (range: string = 'today'): Promise<AnalyticsSummary> => {
    const res = await authFetch(`${BASE_URL}/auth/analytics/summary/?range=${range}`);
    if (res.ok) {
      return await res.json();
    }
    throw new Error('Failed to fetch analytics summary');
  },
  
  getHistoricalSnapshots: async (days: number = 30): Promise<HistoricalSnapshot[]> => {
    const res = await authFetch(`${BASE_URL}/auth/analytics/historical/?days=${days}`);
    if (res.ok) {
      return await res.json();
    }
    throw new Error('Failed to fetch historical snapshots');
  },
  
  getAttackPatternsStats: async (): Promise<{
    total_patterns: number;
    top_techniques: AttackPattern[];
    techniques_by_category: Array<{
      category: string;
      count: number;
      total_frequency: number;
    }>;
  }> => {
    const res = await authFetch(`${BASE_URL}/auth/analytics/attack-patterns-stats/`);
    if (res.ok) {
      return await res.json();
    }
    throw new Error('Failed to fetch attack patterns stats');
  },
  
  updateAnalyticsData: async (metric_type: string, value: number, site?: string): Promise<void> => {
    const res = await authFetch(`${BASE_URL}/auth/analytics/update/`, {
      method: 'POST',
      body: JSON.stringify({ metric_type, value, site }),
    });
    if (!res.ok) {
      throw new Error('Failed to update analytics data');
    }
  },

  getAttackers: async (filters?: {
    skill_level?: string;
    status?: string;
    country?: string;
    min_threat_score?: number;
    limit?: number;
  }): Promise<AttackerProfile[]> => {
    const queryParams = new URLSearchParams();
    if (filters?.skill_level) queryParams.append('skill_level', filters.skill_level);
    if (filters?.status) queryParams.append('status', filters.status);
    if (filters?.country) queryParams.append('country', filters.country);
    if (filters?.min_threat_score) queryParams.append('min_threat_score', String(filters.min_threat_score));
    if (filters?.limit) queryParams.append('limit', String(filters.limit));
    
    const url = `${BASE_URL}/auth/attackers/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const res = await authFetch(url);
    if (res.ok) {
      return await res.json();
    }
    throw new Error('Failed to fetch attackers');
  },
  
  createAttacker: async (attackerData: Partial<AttackerProfile>): Promise<AttackerProfile> => {
    const res = await authFetch(`${BASE_URL}/auth/attackers/`, {
      method: 'POST',
      body: JSON.stringify(attackerData),
    });
    if (res.ok) {
      return await res.json();
    }
    const error = await res.json();
    throw new Error(error.error || 'Failed to create attacker profile');
  },
  
  updateAttacker: async (attackerId: string, data: Partial<AttackerProfile>): Promise<AttackerProfile> => {
    const res = await authFetch(`${BASE_URL}/auth/attackers/${attackerId}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (res.ok) {
      return await res.json();
    }
    throw new Error('Failed to update attacker profile');
  },
  
  deleteAttacker: async (attackerId: string): Promise<void> => {
    const res = await authFetch(`${BASE_URL}/auth/attackers/${attackerId}/`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      throw new Error('Failed to delete attacker profile');
    }
  },
  
  getAttackerBehaviorLogs: async (attackerId: string, limit: number = 50): Promise<AttackerBehaviorLog[]> => {
    const res = await authFetch(`${BASE_URL}/auth/attackers/${attackerId}/behavior-logs/?limit=${limit}`);
    if (res.ok) {
      return await res.json();
    }
    throw new Error('Failed to fetch behavior logs');
  },
  
  addBehaviorLog: async (attackerId: string, log: Omit<AttackerBehaviorLog, 'id' | 'timestamp'>): Promise<AttackerBehaviorLog> => {
    const res = await authFetch(`${BASE_URL}/auth/attackers/${attackerId}/add-behavior/`, {
      method: 'POST',
      body: JSON.stringify(log),
    });
    if (res.ok) {
      return await res.json();
    }
    throw new Error('Failed to add behavior log');
  },
  
  getAttackersSummary: async (): Promise<AttackerSummary> => {
    const res = await authFetch(`${BASE_URL}/auth/attackers/summary/`);
    if (res.ok) {
      return await res.json();
    }
    throw new Error('Failed to fetch attackers summary');
  },
  
  updateAttackerBehaviorAnalysis: async (attackerId: string, analysis: {
    behavior_summary?: string;
    deception_susceptibility?: number;
    preferred_targets?: string[];
  }): Promise<AttackerProfile> => {
    const res = await authFetch(`${BASE_URL}/auth/attackers/${attackerId}/update-analysis/`, {
      method: 'POST',
      body: JSON.stringify(analysis),
    });
    if (res.ok) {
      return await res.json();
    }
    throw new Error('Failed to update behavior analysis');
  },

  getEnvironments: async (filters?: {
    type?: string;
    status?: string;
    site?: string;
    limit?: number;
  }): Promise<DeceptionEnvironment[]> => {
    const queryParams = new URLSearchParams();
    if (filters?.type) queryParams.append('type', filters.type);
    if (filters?.status) queryParams.append('status', filters.status);
    if (filters?.site) queryParams.append('site', filters.site);
    if (filters?.limit) queryParams.append('limit', String(filters.limit));
    
    const url = `${BASE_URL}/auth/environments/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const res = await authFetch(url);
    if (res.ok) {
      return await res.json();
    }
    throw new Error('Failed to fetch deception environments');
  },
  
  createEnvironment: async (envData: Partial<DeceptionEnvironment>): Promise<DeceptionEnvironment> => {
    const res = await authFetch(`${BASE_URL}/auth/environments/`, {
      method: 'POST',
      body: JSON.stringify(envData),
    });
    if (res.ok) {
      return await res.json();
    }
    const error = await res.json();
    throw new Error(error.error || 'Failed to create environment');
  },
  
  updateEnvironment: async (envId: string, data: Partial<DeceptionEnvironment>): Promise<DeceptionEnvironment> => {
    const res = await authFetch(`${BASE_URL}/auth/environments/${envId}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (res.ok) {
      return await res.json();
    }
    throw new Error('Failed to update environment');
  },
  
  deleteEnvironment: async (envId: string): Promise<void> => {
    const res = await authFetch(`${BASE_URL}/auth/environments/${envId}/`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      throw new Error('Failed to delete environment');
    }
  },
  
  recordInteraction: async (envId: string, interaction: Omit<DeceptionInteraction, 'id' | 'timestamp'>): Promise<DeceptionInteraction> => {
    const res = await authFetch(`${BASE_URL}/auth/environments/${envId}/interact/`, {
      method: 'POST',
      body: JSON.stringify(interaction),
    });
    if (res.ok) {
      return await res.json();
    }
    throw new Error('Failed to record interaction');
  },
  
  getEnvironmentInteractions: async (envId: string, limit: number = 50): Promise<DeceptionInteraction[]> => {
    const res = await authFetch(`${BASE_URL}/auth/environments/${envId}/interactions/?limit=${limit}`);
    if (res.ok) {
      return await res.json();
    }
    throw new Error('Failed to fetch environment interactions');
  },
  
  updateEnvironmentAI: async (envId: string, adaptationLevel: number): Promise<DeceptionEnvironment> => {
    const res = await authFetch(`${BASE_URL}/auth/environments/${envId}/update-ai/`, {
      method: 'POST',
      body: JSON.stringify({ ai_adaptation_level: adaptationLevel }),
    });
    if (res.ok) {
      return await res.json();
    }
    throw new Error('Failed to update AI adaptation level');
  },
  
  getEnvironmentsSummary: async (): Promise<EnvironmentSummary> => {
    const res = await authFetch(`${BASE_URL}/auth/environments/summary/`);
    if (res.ok) {
      return await res.json();
    }
    throw new Error('Failed to fetch environments summary');
  },

  getSnippet: async (siteId: string): Promise<{
    site_id: string;
    domain: string;
    snippet: string;
    ingest_url: string;
    platforms: Array<{ id: string; label: string; steps: string[] }>;
  }> => {
    const res = await authFetch(`${BASE_URL}/auth/sites/${siteId}/snippet/`);
    if (res.ok) {
      return await res.json();
    }
    throw new Error('Failed to fetch installation snippet');
  },

  getSdkConfig: async (siteId: string): Promise<{
    site_id: string;
    domain: string;
    api_url: string;
    api_token: string;
    usage: { flask: string; django_settings: string; express: string };
  }> => {
    const res = await authFetch(`${BASE_URL}/auth/sites/${siteId}/sdk-config/`);
    if (res.ok) {
      return await res.json();
    }
    const error = await res.json();
    throw new Error(error.error || 'Failed to fetch SDK config');
  },

  verifySnippet: async (siteId: string): Promise<{ installed: boolean; error?: string }> => {
    const res = await authFetch(`${BASE_URL}/auth/sites/${siteId}/verify/`);
    if (res.ok) {
      return await res.json();
    }
    const error = await res.json();
    throw new Error(error.error || 'Verification failed');
  },

  getSiteProfile: async (siteId: string): Promise<SiteProfile> => {
    const res = await authFetch(`${BASE_URL}/auth/sites/${siteId}/profile/`);
    if (res.ok) return await res.json();
    throw new Error('Failed to fetch site profile');
  },

  triggerSiteProfile: async (siteId: string): Promise<SiteProfile> => {
    const res = await authFetch(`${BASE_URL}/auth/sites/${siteId}/profile/trigger/`, {
      method: 'POST',
    });
    if (res.ok) return await res.json();
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Profiling failed');
  },

  getSessionAIAnalysis: async (sessionId: string): Promise<SessionAIAnalysis> => {
    const res = await authFetch(`${BASE_URL}/auth/active-sessions/${sessionId}/ai-analysis/`);
    if (res.ok) return await res.json();
    throw new Error('Failed to fetch AI analysis');
  },

  getSubscription: async (): Promise<{
    plan: string; is_admin: boolean;
    limits: { sites: number; sessions: number; logs: number };
    plan_name: string;
  }> => {
    const res = await authFetch(`${BASE_URL}/payments/subscription/`);
    if (res.ok) return await res.json();
    throw new Error('Failed to fetch subscription');
  },

  // ── Admin Dashboard API ────────────────────────────────────────────────────
  
  adminGetOverview: async (): Promise<{
    users: { total: number; admin: number; pro: number; enterprise: number; free: number; new_24h: number; new_7d: number };
    sites: { total: number; active: number; monitoring: number; paused: number };
    threats: { total: number; active: number; critical: number; last_24h: number };
    activity: { total_logs: number; flagged_logs: number; logs_24h: number; active_sessions: number };
    revenue: { total_payments: number; total_revenue_usd: number; total_revenue_kes: number; pending_payments: number };
  }> => {
    const res = await authFetch(`${BASE_URL}/admin-api/overview/`);
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to fetch admin overview');
    }
    return res.json();
  },

  adminGetUsers: async (): Promise<Array<{
    id: number; email: string; full_name: string; company_name: string;
    plan: string; is_admin: boolean; is_active: boolean; site_count: number;
    date_joined: string | null; last_login: string | null;
  }>> => {
    const res = await authFetch(`${BASE_URL}/admin-api/users/`);
    if (!res.ok) {
      throw new Error('Failed to fetch users');
    }
    return res.json();
  },

  adminUpdateUser: async (userId: number, data: { plan?: string; is_active?: boolean }): Promise<{
    id: number; email: string; plan: string; is_active: boolean; is_admin: boolean;
  }> => {
    const res = await authFetch(`${BASE_URL}/admin-api/users/${userId}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to update user');
    }
    return res.json();
  },

  adminGetPayments: async (): Promise<Array<{
    id: number; user_email: string; user_name: string; plan: string;
    provider: string; amount: number; currency: string; status: string;
    checkout_id: string; created_at: string;
  }>> => {
    const res = await authFetch(`${BASE_URL}/admin-api/payments/`);
    if (!res.ok) {
      throw new Error('Failed to fetch payments');
    }
    return res.json();
  },

  adminGetSites: async (): Promise<Array<{
    id: string; domain: string; owner: string; owner_email: string; status: string;
    sessions_monitored: number; threats_detected: number;
    registered_date: string | null; last_activity: string | null;
  }>> => {
    const res = await authFetch(`${BASE_URL}/admin-api/sites/`);
    if (!res.ok) {
      throw new Error('Failed to fetch sites');
    }
    return res.json();
  },

  adminGetNotifications: async (): Promise<Array<{
    type: string; title: string; body: string; timestamp: string; severity: string;
  }>> => {
    const res = await authFetch(`${BASE_URL}/admin-api/notifications/`);
    if (!res.ok) {
      throw new Error('Failed to fetch notifications');
    }
    return res.json();
  },
};