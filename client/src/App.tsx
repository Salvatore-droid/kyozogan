import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import PaymentModal from "./components/PaymentModal";
import { useState, useEffect } from "react";

// Core pages — unique data/purpose, fully wired to backend
import RegisteredSites          from "./pages/RegisteredSites";
import ActivityLogs             from "./pages/ActivityLogs";
import ThreatDetection          from "./pages/ThreatDetection";
import ActiveSessions           from "./pages/ActiveSessions";
import AttackPatterns           from "./pages/AttackPatterns";
import DeceptionMonitor         from "./pages/DeceptionMonitor";
import LiveInterventionDashboard from "./pages/LiveInterventionDashboard";
import RemediationDashboard     from "./pages/RemediationDashboard";
import AutomatedPentester       from "./pages/AutomatedPentester";
import Settings                 from "./pages/Settings";
import Billing                  from "./pages/Billing";
import Profile                  from "./pages/Profile";
import Security                 from "./pages/Security";
import AdminDashboard           from "./pages/AdminDashboard";
import Login                    from "./pages/Login";
import Register                 from "./pages/Register";

// Removed: Attackers (duplicates ThreatDetection + ActiveSessions),
//          Analytics (duplicates ActivityLogs + AttackPatterns aggregated),
//          ThreatFeed (duplicates ThreatDetection + AttackPatterns),
//          Environments (niche, data covered by ActiveSessions detail view)

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading, user, isAdmin } = useAuth();
  const [showPayment, setShowPayment] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const dismissed = sessionStorage.getItem('payment_modal_dismissed');
    if (!isAdmin && user.plan === 'free' && !dismissed) {
      const t = setTimeout(() => setShowPayment(true), 1200);
      return () => clearTimeout(t);
    }
  }, [isAuthenticated, user, isAdmin]);

  const handleDismiss = () => {
    sessionStorage.setItem('payment_modal_dismissed', '1');
    setShowPayment(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    window.location.href = '/login';
    return null;
  }

  return (
    <>
      <Component />
      <PaymentModal open={showPayment} onClose={() => setShowPayment(false)} onDismiss={handleDismiss} />
    </>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login"    component={Login} />
      <Route path="/register" component={Register} />

      <Route path="/"                  component={() => <ProtectedRoute component={RegisteredSites} />} />
      <Route path="/activity-logs"     component={() => <ProtectedRoute component={ActivityLogs} />} />
      <Route path="/threat-detection"  component={() => <ProtectedRoute component={ThreatDetection} />} />
      <Route path="/sessions"          component={() => <ProtectedRoute component={ActiveSessions} />} />
      <Route path="/attack-patterns"   component={() => <ProtectedRoute component={AttackPatterns} />} />
      <Route path="/deception-monitor" component={() => <ProtectedRoute component={DeceptionMonitor} />} />
      <Route path="/live-intercept"    component={() => <ProtectedRoute component={LiveInterventionDashboard} />} />
      <Route path="/remediation"       component={() => <ProtectedRoute component={RemediationDashboard} />} />
      <Route path="/pentester"         component={() => <ProtectedRoute component={AutomatedPentester} />} />
      <Route path="/settings"          component={() => <ProtectedRoute component={Settings} />} />
      <Route path="/billing"           component={() => <ProtectedRoute component={Billing} />} />
      <Route path="/profile"           component={() => <ProtectedRoute component={Profile} />} />
      <Route path="/security"          component={() => <ProtectedRoute component={Security} />} />
      <Route path="/admin"             component={() => <ProtectedRoute component={AdminDashboard} />} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider defaultTheme="dark" switchable>
          <TooltipProvider>
            <Toaster position="top-right" richColors />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
