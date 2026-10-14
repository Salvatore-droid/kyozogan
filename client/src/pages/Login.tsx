import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, Mail, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Logo } from '@/components/Logo';

const Login = () => {
  const [, setLocation] = useLocation();
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    if (isAuthenticated && !authLoading) {
      setLocation('/');
    }
  }, [isAuthenticated, authLoading, setLocation]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    setIsLoading(true);
    try {
      await login(email, password);
      toast.success('Login successful! Redirecting...');
    } catch (error: any) {
      toast.error(error.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setIsLoading(true);
    try {
      await login('demo@geniusmirage.com', 'Demo@12345');
      toast.success('Demo login successful! Redirecting...');
    } catch (error: any) {
      toast.error(error.message || 'Demo account login failed. Please check if the demo user exists.');
    } finally {
      setIsLoading(false);
    }
  };

  const loading = isLoading || authLoading;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background Grid Effect */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(0deg, transparent 24%, rgba(13, 115, 119, 0.05) 25%, rgba(13, 115, 119, 0.05) 26%, transparent 27%, transparent 74%, rgba(13, 115, 119, 0.05) 75%, rgba(13, 115, 119, 0.05) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(13, 115, 119, 0.05) 25%, rgba(13, 115, 119, 0.05) 26%, transparent 27%, transparent 74%, rgba(13, 115, 119, 0.05) 75%, rgba(13, 115, 119, 0.05) 76%, transparent 77%, transparent)',
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      {/* Main Container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md z-10"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center justify-center gap-3 mb-6"
          >
            {/* Logo mark */}
            <Logo className="w-10 h-10" />
            {/* Logo name */}
            <div className="leading-none text-left">
              <div className="flex items-baseline gap-1.5">
                <span className="text-[22px] font-black tracking-tight text-foreground uppercase">Genius</span>
                <span className="text-[22px] font-light tracking-widest text-primary uppercase">Mirage</span>
              </div>
              <p className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground mt-0.5">Deception Platform</p>
            </div>
          </motion.div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Welcome Back</h2>
          <p className="text-sm text-muted-foreground">
            Access your threat intelligence and deception management platform
          </p>
        </div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card-professional p-6 mb-6"
        >
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="text-xs text-muted-foreground uppercase font-bold mb-2 block">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-muted-foreground" size={18} />
                <Input
                  type="email"
                  placeholder="admin@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-background border-border text-foreground"
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-muted-foreground uppercase font-bold">
                  Password
                </label>
                <a href="#" className="text-xs text-primary hover:text-primary/80 font-medium">
                  Forgot?
                </a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-muted-foreground" size={18} />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 bg-background border-border text-foreground"
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <Button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold h-10 mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Authenticating...
                </span>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">OR</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Demo Login */}
          <Button
            onClick={handleDemoLogin}
            disabled={loading}
            variant="outline"
            className="w-full border-border text-muted-foreground hover:bg-muted font-bold h-10"
          >
            {loading ? 'Loading...' : 'Try Demo Account'}
          </Button>
        </motion.div>

        {/* Register Link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center"
        >
          <p className="text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <a href="/register" className="text-primary hover:text-primary/80 font-bold transition-colors">
              Sign up here
            </a>
          </p>
        </motion.div>

        {/* Security Notice */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 p-3 bg-primary/5 border border-primary/20 text-xs text-muted-foreground text-center"
        >
          <p>🔒 Your credentials are encrypted and never stored in plain text</p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Login;