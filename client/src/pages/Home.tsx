import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import DashboardLayout from '@/components/DashboardLayout';
import { getAttackLocations } from '@/lib/mockData';
import { api } from '@/lib/api';

const Home = () => {
  const [attackLocations] = useState(getAttackLocations());
  const topCountries = [...attackLocations].sort((a, b) => b.attacks - a.attacks).slice(0, 5);

  // Real counters from the API
  const [counters, setCounters] = useState({ activeEnvironments: 0, attackersTrapped: 0, threatsDetected: 0 });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  const fetchCounters = async () => {
    try {
      const [sites, sessions, logs] = await Promise.all([
        api.getSites().catch(() => []),
        api.getActiveSessions().catch(() => []),
        api.getActivityLogs({ flagged: true, limit: 10 }).catch(() => []),
      ]);
      setCounters({
        activeEnvironments: (sessions as any[]).length,
        attackersTrapped:   (sessions as any[]).filter((s: any) => s.backend_type === 'deceptive').length,
        threatsDetected:    (sites as any[]).reduce((a: number, s: any) => a + (s.threats_detected || 0), 0),
      });
      setRecentActivity(logs as any[]);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    fetchCounters();
    const interval = setInterval(fetchCounters, 15000);
    return () => clearInterval(interval);
  }, []);

  const getRiskColor = (threatLevel: string) => {
    if (threatLevel === 'critical') return '#D32F2F';
    if (threatLevel === 'high') return '#F57C00';
    return '#0D7377';
  };

  return (
    <DashboardLayout>
      <div className="w-full h-full flex">
        {/* Main Map Area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="bg-card border-b border-border p-6">
            <h1 className="text-2xl font-bold text-foreground mb-1">Live Attack Map</h1>
            <p className="text-muted-foreground text-sm">Real-time global threat monitoring and deception environment tracking</p>
          </div>

          {/* Map Container */}
          <div className="flex-1 relative bg-background overflow-hidden">
            {/* SVG World Map Background */}
            <svg
              viewBox="0 0 1000 600"
              className="absolute inset-0 w-full h-full opacity-10"
              preserveAspectRatio="xMidYMid slice"
            >
              <defs>
                <linearGradient id="mapGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0D7377" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="#F57C00" stopOpacity="0.1" />
                </linearGradient>
              </defs>
              <rect width="1000" height="600" fill="url(#mapGradient)" />
              <g stroke="#0D7377" strokeWidth="0.5" opacity="0.1">
                {Array.from({ length: 36 }).map((_, i) => (
                  <line key={`h-${i}`} x1="0" y1={i * 16.67} x2="1000" y2={i * 16.67} />
                ))}
                {Array.from({ length: 60 }).map((_, i) => (
                  <line key={`v-${i}`} x1={i * 16.67} y1="0" x2={i * 16.67} y2="600" />
                ))}
              </g>
            </svg>

            {/* Attack Markers */}
            <div className="absolute inset-0">
              {attackLocations.map((location, idx) => {
                const x = ((location.lng + 180) / 360) * 100;
                const y = ((90 - location.lat) / 180) * 100;

                return (
                  <motion.div
                    key={location.countryCode}
                    className="absolute"
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <div
                      className="w-3 h-3 rounded-full pulse-subtle border border-current"
                      style={{
                        backgroundColor: getRiskColor(location.threatLevel),
                        color: getRiskColor(location.threatLevel),
                      }}
                    />
                    <div className="absolute top-5 left-1/2 transform -translate-x-1/2 whitespace-nowrap text-xs text-muted-foreground font-mono pointer-events-none">
                      {location.attacks}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-80 bg-card border-l border-border flex flex-col overflow-hidden">
          {/* Real-time Counters */}
          <div className="p-4 border-b border-border">
            <h2 className="text-sm font-bold text-foreground mb-4 uppercase tracking-wide">Live Metrics</h2>
            <div className="space-y-3">
              <motion.div
                className="card-professional p-3"
                animate={{ opacity: [1, 0.9, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <div className="text-xs text-muted-foreground mb-1">Active Environments</div>
                <div className="text-2xl font-bold text-primary font-mono">{counters.activeEnvironments}</div>
              </motion.div>
              <motion.div
                className="card-professional p-3"
                animate={{ opacity: [1, 0.9, 1] }}
                transition={{ duration: 2.5, repeat: Infinity }}
              >
                <div className="text-xs text-muted-foreground mb-1">Attackers Trapped</div>
                <div className="text-2xl font-bold text-destructive font-mono">{counters.attackersTrapped}</div>
              </motion.div>
              <motion.div
                className="card-professional p-3"
                animate={{ opacity: [1, 0.9, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <div className="text-xs text-muted-foreground mb-1">Threats Detected</div>
                <div className="text-2xl font-bold text-secondary font-mono">{counters.threatsDetected}</div>
              </motion.div>
            </div>
          </div>

          {/* Top Attacking Countries */}
          <div className="p-4 border-b border-border">
            <h3 className="text-xs font-bold text-foreground mb-3 uppercase tracking-wider">Top Threat Sources</h3>
            <div className="space-y-2">
              {topCountries.map((country, idx) => (
                <motion.div
                  key={country.countryCode}
                  className="flex items-center justify-between p-2 rounded bg-background hover:bg-muted transition-colors"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <div className="flex items-center gap-2">
                    <div className="status-indicator" style={{ backgroundColor: getRiskColor(country.threatLevel) }} />
                    <span className="text-sm text-foreground">{country.country}</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-muted-foreground">{country.attacks}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Recent Flagged Activity */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Recent Flagged Activity</h3>
            </div>
            <div className="flex-1 overflow-y-auto">
              {recentActivity.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">No flagged activity yet</div>
              ) : recentActivity.map((log: any, idx: number) => (
                <motion.div key={log.id}
                  className="p-3 border-b border-border hover:bg-muted transition-colors cursor-pointer"
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full mt-1 flex-shrink-0"
                      style={{ backgroundColor: log.suspicion_score > 75 ? '#D32F2F' : log.suspicion_score > 50 ? '#F57C00' : '#0D7377' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground font-mono">
                        {new Date(log.timestamp).toLocaleTimeString()} · {log.domain}
                      </p>
                      <p className="text-xs text-foreground mt-1 line-clamp-1 font-mono">{log.method} {log.endpoint}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Score: {log.suspicion_score} · {log.ip_address}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Home;
