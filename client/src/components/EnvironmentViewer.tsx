import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, RefreshCw, Activity, Target, Brain, Clock, AlertTriangle, Shield, Database, Server, Mail, Cloud, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { api, DeceptionInteraction } from '@/lib/api';

interface DeceptionEnvironment {
  id: string;
  name: string;
  type: string;
  type_display: string;
  status: string;
  description: string;
  attackerCount: number;
  aiAdaptationLevel: number;
  honeypots: number;
  lastTriggered: Date;
  deception_level?: string;
  response_delay_ms?: number;
  error_rate?: number;
  fake_data_volume?: string;
}

interface EnvironmentViewerProps {
  environment: DeceptionEnvironment;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function EnvironmentViewer({ environment, onClose, onUpdate }: EnvironmentViewerProps) {
  const [activeTab, setActiveTab] = useState<'interface' | 'logs' | 'metrics' | 'config'>('interface');
  const [interactions, setInteractions] = useState<DeceptionInteraction[]>([]);
  const [loading, setLoading] = useState(false);
  const [simulatedRequest, setSimulatedRequest] = useState({
    method: 'GET',
    path: '/',
    body: ''
  });
  const [simulatedResponse, setSimulatedResponse] = useState<string | null>(null);

  useEffect(() => {
    fetchInteractions();
  }, [environment.id]);

  const fetchInteractions = async () => {
    try {
      setLoading(true);
      const data = await api.getEnvironmentInteractions(environment.id, 50);
      setInteractions(data);
    } catch (error) {
      console.error('Failed to fetch interactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateRequest = async () => {
    try {
      const interaction = await api.recordInteraction(environment.id, {
        request_path: simulatedRequest.path,
        request_method: simulatedRequest.method,
        request_headers: { 'User-Agent': 'Genius-Mirage-Simulator' },
        request_body: simulatedRequest.body,
        response_status: 200,
        response_body: JSON.stringify({ message: 'Request processed by deception environment' }),
        response_time_ms: Math.floor(Math.random() * 200) + 50,
        was_deceptive: true,
        triggered_alert: environment.status === 'under_attack',
        technique_detected: simulatedRequest.path.includes('admin') ? 'Admin Access Attempt' : undefined
      });
      
      setSimulatedResponse(JSON.stringify({
        status: interaction.response_status,
        message: 'Request processed',
        deception_active: true,
        environment: environment.name
      }, null, 2));
      
      toast.success('Simulated request recorded');
      fetchInteractions();
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error('Failed to simulate request');
    }
  };

  const renderEnvironmentInterface = () => {
    const getDeceptiveContent = () => {
      const content = {
        admin_panel: {
          title: `${environment.name} - Admin Dashboard`,
          version: 'v2.4.1',
          users: 1247,
          lastLogin: new Date().toLocaleString(),
          failedAttempts: environment.attackerCount * 7,
          honeypotNote: `This is a deception environment. ${environment.honeypots} honeypot resources active.`
        },
        database: {
          title: `${environment.name} - Database Connection`,
          engine: 'MySQL 8.0',
          tables: ['users', 'accounts', 'transactions', 'logs', 'credentials'],
          query: 'SELECT * FROM users WHERE role = "admin" LIMIT 5;',
          honeypotNote: `Decoy database with ${environment.honeypots} honeypot tables. All queries logged.`
        },
        api: {
          title: `${environment.name} - API Gateway`,
          version: 'v3.2.0',
          endpoints: ['/auth/login', '/api/users', '/api/data', '/admin/config'],
          recentRequests: environment.attackerCount,
          honeypotNote: `API deception active. ${environment.honeypots} decoy endpoints deployed.`
        },
        file_server: {
          title: `${environment.name} - File Share`,
          shares: ['documents', 'backups', 'database', 'credentials', 'configs'],
          files: ['passwords.txt', 'config.xml', 'backup.zip', 'keys.pem'],
          honeypotNote: `${environment.honeypots} honeypot files planted. Access attempts being monitored.`
        },
        email_server: {
          title: `${environment.name} - Email Server`,
          version: 'Exchange 2019',
          users: 342,
          unreadMessages: environment.attackerCount * 3,
          honeypotNote: `Decoy email accounts active. ${environment.honeypots} monitoring rules in place.`
        },
        default: {
          title: `${environment.name} - Deception Environment`,
          version: '1.0.0',
          honeypotNote: 'This is a monitored deception environment. All activity is logged.'
        }
      };
      return content[environment.type as keyof typeof content] || content.default;
    };

    const content = getDeceptiveContent();

    return (
      <div className="space-y-4">
        <div className="bg-gray-900 text-gray-100 p-4 rounded font-mono text-xs space-y-2">
          <div className="text-primary font-bold">{content.title}</div>
          <div className="border border-gray-700 p-3 rounded bg-gray-950 space-y-2">
            {content.version && <div className="text-gray-500">Version: {content.version}</div>}
            {'users' in content && <div className="text-gray-500">Active Users: {content.users}</div>}
            {'lastLogin' in content && <div className="text-gray-500">Last Login: {content.lastLogin}</div>}
            {'failedAttempts' in content && <div className="text-gray-500">Failed Login Attempts: {content.failedAttempts}</div>}
            {'engine' in content && <div className="text-gray-500">Database Engine: {content.engine}</div>}
            {'tables' in content && (
              <div>
                <div className="text-gray-500 mb-1">Tables:</div>
                <div className="text-green-600 text-xs">
                  {content.tables.slice(0, 5).map(table => (
                    <div key={table}>📊 {table}</div>
                  ))}
                </div>
              </div>
            )}
            {'query' in content && (
              <div>
                <div className="text-gray-500 mb-1">Sample Query:</div>
                <div className="text-green-600">mysql&gt; {content.query}</div>
              </div>
            )}
            {'endpoints' in content && (
              <div>
                <div className="text-gray-500 mb-1">Available Endpoints:</div>
                {content.endpoints.map(endpoint => (
                  <div key={endpoint} className="text-yellow-600">→ {endpoint}</div>
                ))}
              </div>
            )}
            {'shares' in content && (
              <div>
                <div className="text-gray-500 mb-1">Network Shares:</div>
                <div className="text-cyan-600">
                  {content.shares.map(share => (
                    <div key={share}>📁 {share}/</div>
                  ))}
                </div>
              </div>
            )}
            {'files' in content && (
              <div>
                <div className="text-gray-500 mb-1">Decoy Files:</div>
                <div className="text-red-600">
                  {content.files.map(file => (
                    <div key={file}>📄 {file} (HONEYPOT)</div>
                  ))}
                </div>
              </div>
            )}
            <div className="text-gray-600 mt-2 border-t border-gray-700 pt-2">
              &gt; {content.honeypotNote}
            </div>
            <div className="text-gray-600">
              &gt; AI Adaptation Level: {environment.aiAdaptationLevel}%
            </div>
            <div className="text-gray-600">
              &gt; Deception Level: {environment.deception_level || 'advanced'}
            </div>
          </div>
        </div>

        {/* Simulate Request */}
        <div className="bg-muted rounded-lg p-4">
          <h4 className="text-xs font-bold text-foreground mb-3">Simulate Attacker Request</h4>
          <div className="space-y-3">
            <div className="flex gap-2">
              <select
                value={simulatedRequest.method}
                onChange={(e) => setSimulatedRequest({ ...simulatedRequest, method: e.target.value })}
                className="px-2 py-1 bg-background border border-border rounded text-xs"
              >
                <option>GET</option>
                <option>POST</option>
                <option>PUT</option>
                <option>DELETE</option>
              </select>
              <input
                type="text"
                value={simulatedRequest.path}
                onChange={(e) => setSimulatedRequest({ ...simulatedRequest, path: e.target.value })}
                placeholder="/api/endpoint"
                className="flex-1 px-2 py-1 bg-background border border-border rounded text-xs"
              />
            </div>
            <textarea
              value={simulatedRequest.body}
              onChange={(e) => setSimulatedRequest({ ...simulatedRequest, body: e.target.value })}
              placeholder="Request body (optional)"
              className="w-full px-2 py-1 bg-background border border-border rounded text-xs h-20"
            />
            <Button onClick={handleSimulateRequest} size="sm" className="w-full">
              Simulate Request
            </Button>
            {simulatedResponse && (
              <div className="bg-gray-900 rounded p-2 mt-2">
                <pre className="text-green-600 text-xs overflow-x-auto">{simulatedResponse}</pre>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const statusColor = {
    active: '#388E3C',
    under_attack: '#D32F2F',
    compromised: '#F57C00',
    idle: '#90A4AE',
    maintenance: '#FF9800',
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Shield size={14} />;
      case 'under_attack': return <AlertTriangle size={14} />;
      case 'compromised': return <Target size={14} />;
      default: return <Activity size={14} />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'admin_panel': return <Shield size={16} />;
      case 'database': return <Database size={16} />;
      case 'api': return <Cloud size={16} />;
      case 'file_server': return <Server size={16} />;
      case 'email_server': return <Mail size={16} />;
      case 'iot_device': return <Wifi size={16} />;
      default: return <Activity size={16} />;
    }
  };

  const formatLogMessage = (interaction: DeceptionInteraction) => {
    const time = new Date(interaction.timestamp).toLocaleTimeString();
    const ip = interaction.request_headers?.['X-Forwarded-For'] || 'unknown';
    return `[${time}] ${interaction.request_method} ${interaction.request_path} from ${ip} - ${interaction.response_status} (${interaction.response_time_ms}ms)${interaction.was_deceptive ? ' [DECEPTION ACTIVE]' : ''}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-card rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-border p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                {getTypeIcon(environment.type)}
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">{environment.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-muted-foreground">{environment.type_display}</p>
                  <span className="text-xs text-muted-foreground">•</span>
                  <div className="flex items-center gap-1">
                    {getStatusIcon(environment.status)}
                    <p 
                      className="text-xs font-medium capitalize"
                      style={{ color: statusColor[environment.status as keyof typeof statusColor] }}
                    >
                      {environment.status.replace(/_/g, ' ')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X size={20} />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 pt-2 border-b border-border bg-background">
          {['interface', 'logs', 'metrics', 'config'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-2 text-sm font-medium transition-all rounded-t-lg ${
                activeTab === tab
                  ? 'bg-card text-primary border-t border-l border-r border-border'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'interface' && renderEnvironmentInterface()}

          {activeTab === 'logs' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-foreground">Activity Logs</h3>
                <Button variant="ghost" size="sm" onClick={fetchInteractions} className="h-7">
                  <RefreshCw size={12} className="mr-1" />
                  Refresh
                </Button>
              </div>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : interactions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Activity size={48} className="mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No interactions recorded yet</p>
                  <p className="text-xs mt-1">Use the simulator to test the environment</p>
                </div>
              ) : (
                <div className="bg-gray-900 rounded-lg p-4 font-mono text-xs space-y-1 max-h-96 overflow-y-auto">
                  {interactions.map((interaction, idx) => (
                    <div key={idx} className="text-gray-400 hover:text-gray-300 border-b border-gray-800 pb-1">
                      {formatLogMessage(interaction)}
                      {interaction.technique_detected && (
                        <span className="text-yellow-600 ml-2">[{interaction.technique_detected}]</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'metrics' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-foreground mb-3">Environment Metrics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="card-professional p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target size={16} className="text-primary" />
                    <p className="text-xs text-muted-foreground uppercase font-bold">Attackers Trapped</p>
                  </div>
                  <p className="text-2xl font-bold text-primary">{environment.attackerCount}</p>
                  <p className="text-xs text-muted-foreground mt-1">Total unique attackers</p>
                </div>
                <div className="card-professional p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain size={16} className="text-primary" />
                    <p className="text-xs text-muted-foreground uppercase font-bold">AI Adaptation Level</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${environment.aiAdaptationLevel}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-primary">{environment.aiAdaptationLevel}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Self-learning capability</p>
                </div>
                <div className="card-professional p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield size={16} className="text-primary" />
                    <p className="text-xs text-muted-foreground uppercase font-bold">Active Honeypots</p>
                  </div>
                  <p className="text-2xl font-bold text-primary">{environment.honeypots}</p>
                  <p className="text-xs text-muted-foreground mt-1">Decoy resources deployed</p>
                </div>
                <div className="card-professional p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock size={16} className="text-primary" />
                    <p className="text-xs text-muted-foreground uppercase font-bold">Last Activity</p>
                  </div>
                  <p className="text-sm font-mono text-primary">
                    {environment.lastTriggered.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Most recent interaction</p>
                </div>
              </div>

              <div className="card-professional p-4 mt-4">
                <h4 className="text-xs font-bold text-foreground mb-3">Deception Effectiveness</h4>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Success Rate</span>
                  <span className="text-xs font-bold text-primary">
                    {Math.round((environment.attackerCount / (environment.attackerCount + 1)) * 100)}%
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-600 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((environment.attackerCount / (environment.attackerCount + 1)) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Based on {interactions.length} total interactions and {environment.attackerCount} unique attackers
                </p>
              </div>
            </div>
          )}

          {activeTab === 'config' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-foreground mb-3">Environment Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="card-professional p-4">
                  <p className="text-xs text-muted-foreground mb-2 uppercase font-bold">Deception Level</p>
                  <p className="text-base font-bold text-primary capitalize">{environment.deception_level || 'advanced'}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {environment.deception_level === 'advanced' && 'Full environment simulation with realistic data'}
                    {environment.deception_level === 'intermediate' && 'Moderate realism with some decoy data'}
                    {environment.deception_level === 'basic' && 'Simple responses with minimal deception'}
                  </p>
                </div>
                <div className="card-professional p-4">
                  <p className="text-xs text-muted-foreground mb-2 uppercase font-bold">Response Delay</p>
                  <p className="text-base font-bold text-primary">{environment.response_delay_ms || 100}ms</p>
                  <p className="text-xs text-muted-foreground mt-1">Artificial latency to simulate real systems</p>
                </div>
                <div className="card-professional p-4">
                  <p className="text-xs text-muted-foreground mb-2 uppercase font-bold">Error Rate</p>
                  <p className="text-base font-bold text-primary">{((environment.error_rate || 0.05) * 100)}%</p>
                  <p className="text-xs text-muted-foreground mt-1">Simulated error responses</p>
                </div>
                <div className="card-professional p-4">
                  <p className="text-xs text-muted-foreground mb-2 uppercase font-bold">Data Volume</p>
                  <p className="text-base font-bold text-primary capitalize">{environment.fake_data_volume || 'medium'}</p>
                  <p className="text-xs text-muted-foreground mt-1">Amount of generated decoy data</p>
                </div>
              </div>

              <div className="card-professional p-4">
                <h4 className="text-xs font-bold text-foreground mb-3">Security Settings</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-foreground">Network Isolation</span>
                    <Badge className="bg-green-600/20 text-green-600">Enabled</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-foreground">Traffic Logging</span>
                    <Badge className="bg-green-600/20 text-green-600">Enabled</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-foreground">Payload Analysis</span>
                    <Badge className="bg-green-600/20 text-green-600">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-foreground">Real-time Alerts</span>
                    <Badge className={environment.status === 'under_attack' ? "bg-red-600/20 text-red-600" : "bg-green-600/20 text-green-600"}>
                      {environment.status === 'under_attack' ? 'Triggered' : 'Monitoring'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border p-3 bg-muted/30">
          <p className="text-xs text-center text-muted-foreground">
            🔒 All interactions are logged for analysis. This is a monitored deception environment.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}