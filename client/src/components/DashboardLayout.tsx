import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'wouter';
import {
  Menu, X, Moon, Sun, Globe, Shield, Activity, Zap, Brain, Eye,
  Settings, LogOut, User, ChevronDown, Bell, Database, Target,
  BarChart3, Fingerprint, Crown, CreditCard, AlertTriangle,
  Info, CheckCircle, ShieldCheck, Users, Terminal, ScanSearch,
} from 'lucide-react';import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { api } from '@/lib/api';

/* ─── Nav items ──────────────────────────────────────────────── */
const navigationItems = [
  { href: '/',                  label: 'Registered Sites',    icon: Globe,      group: 'protection'   },
  { href: '/activity-logs',     label: 'Activity Monitoring', icon: Activity,   group: 'protection'   },
  { href: '/threat-detection',  label: 'Threat Detection',    icon: Shield,     group: 'protection'   },
  { href: '/sessions',          label: 'Active Sessions',     icon: Zap,        group: 'intelligence' },
  { href: '/attack-patterns',   label: 'Attack Patterns',     icon: Brain,      group: 'intelligence' },
  { href: '/deception-monitor', label: 'Deception Monitor',   icon: Eye,        group: 'deception'    },
  { href: '/live-intercept',    label: 'Live Intercept',      icon: Terminal,   group: 'deception'    },
  { href: '/remediation',       label: 'Remediation',         icon: ShieldCheck, group: 'deception'   },
  { href: '/pentester',         label: 'Automated Pentester', icon: ScanSearch,  group: 'deception'   },
  { href: '/settings',          label: 'Settings',            icon: Settings,   group: 'system'       },
  { href: '/billing',           label: 'Billing & Plan',      icon: CreditCard, group: 'system'       },
];

const adminNavItems = [
  { href: '/admin',             label: 'Admin Dashboard',     icon: Crown,     group: 'admin'        },
];

const groupLabels: Record<string, string> = {
  protection: 'Protection', intelligence: 'Intelligence',
  deception: 'Deception',   analytics: 'Analytics',
  system: 'System',         admin: 'Admin',
};

/* ─── Notification type ──────────────────────────────────────── */
interface Notification {
  type: string; title: string; body: string; timestamp: string; severity: string;
}

const SEVERITY_ICON: Record<string, React.ReactNode> = {
  critical: <AlertTriangle size={12} className="text-destructive flex-shrink-0 mt-0.5" />,
  high:     <ShieldCheck   size={12} className="text-amber-500 flex-shrink-0 mt-0.5" />,
  info:     <Info          size={12} className="text-primary flex-shrink-0 mt-0.5" />,
};

/* ─── DashboardLayout ────────────────────────────────────────── */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { theme, toggleTheme } = useTheme();
  const { user, isAdmin, logout } = useAuth();

  // Notifications
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifLoading, setNotifLoading]   = useState(false);
  const [notifOpen, setNotifOpen]         = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!isAdmin) return;
    setNotifLoading(true);
    try {
      const res = await fetch('/api/admin-api/notifications/', {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      });
      if (res.ok) setNotifications(await res.json());
    } catch {}
    finally { setNotifLoading(false); }
  }, [isAdmin]);

  // Also fetch flagged activity for non-admin users
  const [userNotifs, setUserNotifs] = useState<Notification[]>([]);
  const fetchUserNotifs = useCallback(async () => {
    if (isAdmin) return;
    try {
      const logs = await api.getActivityLogs({ flagged: true, limit: 5 }).catch(() => []);
      setUserNotifs((logs as any[]).map(l => ({
        type: 'flagged', title: 'Flagged Activity',
        body: `${l.method} ${l.endpoint} on ${l.domain}`,
        timestamp: l.timestamp, severity: l.suspicion_score > 75 ? 'critical' : 'high',
      })));
    } catch {}
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) fetchNotifications();
    else fetchUserNotifs();
    const interval = setInterval(() => {
      if (isAdmin) fetchNotifications(); else fetchUserNotifs();
    }, 30000);
    return () => clearInterval(interval);
  }, [isAdmin, fetchNotifications, fetchUserNotifs]);

  const allNotifs = isAdmin ? notifications : userNotifs;
  const unreadCount = allNotifs.length;

  const handleLogout = async () => {
    await logout();
    setLocation('/login');
    toast.success('Logged out successfully');
  };

  const getUserInitials = () => {
    if (user?.full_name) return user.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
    if (user?.email) return user.email[0].toUpperCase();
    return 'U';
  };
  const getUserDisplayName = () => {
    if (user?.full_name) return user.full_name;
    if (user?.email) return user.email.split('@')[0];
    return 'User';
  };

  const planLabel = isAdmin ? 'Admin' : (user?.plan ? user.plan.charAt(0).toUpperCase() + user.plan.slice(1) : 'Free');
  const planColor = isAdmin ? '#D32F2F' : user?.plan === 'enterprise' ? '#7B1FA2' : user?.plan === 'pro' ? '#0D7377' : '#78909C';

  const allNavItems = isAdmin ? [...navigationItems, ...adminNavItems] : navigationItems;
  const groups = Object.entries(
    allNavItems.reduce((acc, item) => {
      if (!acc[item.group]) acc[item.group] = [];
      acc[item.group].push(item);
      return acc;
    }, {} as Record<string, typeof allNavItems>)
  );

  const fmtTime = (iso: string) => {
    try {
      const d = new Date(iso);
      const diff = Date.now() - d.getTime();
      if (diff < 60000) return 'just now';
      if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`;
      if (diff < 86400000) return `${Math.floor(diff/3600000)}h ago`;
      return d.toLocaleDateString();
    } catch { return ''; }
  };

  return (
    <div className="flex h-screen bg-background text-foreground">

      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <aside className={cn(
        'bg-sidebar border-r border-sidebar-border transition-all duration-300 flex flex-col fixed h-full z-20',
        sidebarOpen ? 'w-64' : 'w-20'
      )}>
        {/* Logo */}
        <div className="px-4 h-14 border-b border-sidebar-border flex items-center justify-between flex-shrink-0">
          {sidebarOpen ? (
            <div className="flex items-center gap-3 overflow-hidden">
              <Logo className="w-7 h-7" />
              <div className="leading-none">
                <div className="flex items-baseline gap-1">
                  <span className="text-[15px] font-black tracking-tight text-foreground uppercase">Genius</span>
                  <span className="text-[15px] font-light tracking-widest text-primary uppercase">Mirage</span>
                </div>
                <p className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground/70 mt-0.5">Deception Platform</p>
              </div>
            </div>
          ) : (
            <Logo className="w-7 h-7 mx-auto" />
          )}
          <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-sidebar-foreground hover:bg-sidebar-accent flex-shrink-0">
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2 px-2.5">
          {groups.map(([group, items]) => (
            <div key={group} className="mb-1">
              {sidebarOpen && (
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 px-2.5 pt-3 pb-1.5">
                  {groupLabels[group]}
                </p>
              )}
              {items.map((item) => {
                const isActive = location === item.href;
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} title={!sidebarOpen ? item.label : undefined}
                    className={cn(
                      'group flex items-center gap-3 px-3 py-2 transition-all duration-200 mb-0.5 relative',
                      isActive ? 'bg-primary/10 text-primary' : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                      item.group === 'admin' && 'border border-destructive/20 bg-destructive/5 hover:bg-destructive/10'
                    )}>
                    {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-primary" />}
                    <Icon size={17} className={cn('flex-shrink-0', isActive ? 'text-primary' : '', item.group === 'admin' ? 'text-destructive/70' : '')} />
                    {sidebarOpen && <span className="font-medium text-sm truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-sidebar-border space-y-2">
          <Button variant="ghost" size="sm" onClick={toggleTheme}
            className="w-full text-sidebar-foreground hover:bg-sidebar-accent justify-center"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            {sidebarOpen && <span className="ml-2 text-sm">Toggle Theme</span>}
          </Button>
          <Button variant="outline" size="sm" onClick={handleLogout}
            className="w-full border-destructive text-destructive hover:bg-destructive/10 flex items-center gap-2 justify-center">
            <LogOut size={18} />
            {sidebarOpen && <span>Logout</span>}
          </Button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────── */}
      <main className={cn('flex-1 overflow-auto transition-all duration-300', sidebarOpen ? 'ml-64' : 'ml-20')}>

        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
          <div className="flex items-center justify-between px-6 py-3">

            {/* Page title */}
            <div className="flex items-center gap-2">
              <div className="h-8 w-1 bg-primary rounded-full" />
              <h2 className="text-lg font-semibold text-foreground">
                {[...navigationItems, ...adminNavItems].find(i => i.href === location)?.label || 'Dashboard'}
              </h2>
            </div>

            <div className="flex items-center gap-3">

              {/* ── Notifications ────────────────────────────────── */}
              <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="relative"
                    onClick={() => { setNotifOpen(o => !o); if (!notifOpen && isAdmin) fetchNotifications(); }}>
                    <Bell size={18} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-4 w-4 bg-destructive rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-96">
                  <DropdownMenuLabel className="flex items-center justify-between">
                    <span>Notifications</span>
                    {notifLoading && <span className="text-[10px] text-muted-foreground">Refreshing…</span>}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <div className="max-h-80 overflow-y-auto">
                    {allNotifs.length === 0 ? (
                      <div className="py-6 text-center text-xs text-muted-foreground">
                        <CheckCircle size={20} className="mx-auto mb-2 text-muted-foreground/30" />
                        No new notifications
                      </div>
                    ) : allNotifs.map((n, i) => (
                      <div key={i} className="px-3 py-2.5 border-b border-border/60 last:border-0 hover:bg-muted/50 transition-colors">
                        <div className="flex items-start gap-2">
                          {SEVERITY_ICON[n.severity] || SEVERITY_ICON.info}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-foreground">{n.title}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                            <p className="text-[10px] text-primary mt-1">{fmtTime(n.timestamp)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <div className="px-3 py-2">
                        <Link href="/admin">
                          <span className="text-xs text-primary hover:underline cursor-pointer">View admin dashboard →</span>
                        </Link>
                      </div>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* ── User dropdown ─────────────────────────────────── */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 px-2 hover:bg-muted">
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                          {getUserInitials()}
                        </AvatarFallback>
                      </Avatar>
                      {/* Plan badge on avatar */}
                      {isAdmin && (
                        <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-destructive rounded-full flex items-center justify-center">
                          <Crown size={8} className="text-white" />
                        </span>
                      )}
                    </div>
                    <div className="text-left hidden sm:block">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-foreground leading-none">{getUserDisplayName()}</p>
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-sm"
                          style={{ color: planColor, backgroundColor: planColor + '20', border: `1px solid ${planColor}40` }}>
                          {planLabel}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{user?.email}</p>
                    </div>
                    <ChevronDown size={14} className="text-muted-foreground hidden sm:block" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuLabel>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold">{getUserDisplayName()}</p>
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-sm"
                          style={{ color: planColor, backgroundColor: planColor + '20', border: `1px solid ${planColor}40` }}>
                          {planLabel}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                      {user?.company_name && <p className="text-xs text-muted-foreground">{user.company_name}</p>}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer" onClick={() => setLocation('/profile')}>
                    <User size={14} className="mr-2" /> Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer" onClick={() => setLocation('/security')}>
                    <Fingerprint size={14} className="mr-2" /> Security
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer" onClick={() => setLocation('/billing')}>
                    <CreditCard size={14} className="mr-2" /> Billing & Plan
                  </DropdownMenuItem>
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="cursor-pointer text-destructive" onClick={() => setLocation('/admin')}>
                        <Crown size={14} className="mr-2" /> Admin Dashboard
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer" onClick={() => setLocation('/admin?tab=users')}>
                        <Users size={14} className="mr-2" /> Manage Users
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer text-destructive" onClick={handleLogout}>
                    <LogOut size={14} className="mr-2" /> Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

            </div>
          </div>
        </div>

        {/* Page content */}
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
