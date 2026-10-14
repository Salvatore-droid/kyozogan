import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, Mail, User, Building2, Eye, EyeOff, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { api, saveTokens } from '@/lib/api';
import { Logo } from '@/components/Logo';

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
}

const Register = () => {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    fullName: '',
    companyName: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const calculatePasswordStrength = (password: string): PasswordStrength => {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z\d]/.test(password)) score++;

    const strengths: PasswordStrength[] = [
      { score: 0, label: 'Very Weak',   color: '#D32F2F' },
      { score: 1, label: 'Weak',        color: '#F57C00' },
      { score: 2, label: 'Fair',        color: '#FBC02D' },
      { score: 3, label: 'Good',        color: '#7CB342' },
      { score: 4, label: 'Strong',      color: '#388E3C' },
      { score: 5, label: 'Very Strong', color: '#0D7377' },
    ];

    return strengths[Math.min(score, 5)];
  };

  const passwordStrength = calculatePasswordStrength(formData.password);
  const passwordsMatch   = formData.password === formData.confirmPassword && formData.password.length > 0;

  const isFormValid =
    formData.fullName.trim() &&
    formData.companyName.trim() &&
    formData.email.trim() &&
    formData.password &&
    formData.confirmPassword &&
    passwordsMatch &&
    formData.agreeTerms;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      toast.error('Please fill in all fields correctly');
      return;
    }
    setIsLoading(true);
    try {
      const { ok, data } = await api.register({
        email:           formData.email.trim().toLowerCase(),
        full_name:       formData.fullName.trim(),
        company_name:    formData.companyName.trim(),
        password:        formData.password,
        confirmPassword: formData.confirmPassword,
      });

      if (ok) {
        saveTokens(data.access, data.refresh);
        localStorage.setItem('user', JSON.stringify(data.user));
        toast.success('Account created successfully! Welcome aboard.');
        setLocation('/');
      } else {
        const errorMessages = Object.entries(data)
          .map(([field, messages]) => {
            const label = field === 'non_field_errors' ? '' : `${field}: `;
            return `${label}${(messages as string[]).join(' ')}`;
          })
          .join('\n');
        toast.error(errorMessages || 'Registration failed. Please try again.');
      }
    } catch {
      toast.error('Network error — please check your connection');
    } finally {
      setIsLoading(false);
    }
  };

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
        className="w-full max-w-lg z-10"
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
          <h2 className="text-2xl font-bold text-foreground mb-2">Create Account</h2>
          <p className="text-sm text-muted-foreground">
            Join the next generation of threat intelligence and deception technology
          </p>
        </div>

        {/* Register Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card-professional p-6 mb-6"
        >
          <form onSubmit={handleRegister} className="space-y-4">

            {/* Full Name */}
            <div>
              <label className="text-xs text-muted-foreground uppercase font-bold mb-2 block">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 text-muted-foreground" size={18} />
                <Input
                  type="text"
                  name="fullName"
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className="pl-10 bg-background border-border text-foreground"
                  disabled={isLoading}
                  autoComplete="name"
                />
              </div>
            </div>

            {/* Company Name */}
            <div>
              <label className="text-xs text-muted-foreground uppercase font-bold mb-2 block">
                Company Name
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-3 text-muted-foreground" size={18} />
                <Input
                  type="text"
                  name="companyName"
                  placeholder="Your Company"
                  value={formData.companyName}
                  onChange={handleInputChange}
                  className="pl-10 bg-background border-border text-foreground"
                  disabled={isLoading}
                  autoComplete="organization"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="text-xs text-muted-foreground uppercase font-bold mb-2 block">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-muted-foreground" size={18} />
                <Input
                  type="email"
                  name="email"
                  placeholder="admin@company.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="pl-10 bg-background border-border text-foreground"
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-xs text-muted-foreground uppercase font-bold mb-2 block">
                Password
              </label>
              <div className="relative mb-2">
                <Lock className="absolute left-3 top-3 text-muted-foreground" size={18} />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="pl-10 pr-10 bg-background border-border text-foreground"
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Password Strength Meter */}
              {formData.password && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-muted overflow-hidden">
                      <motion.div
                        className="h-full"
                        style={{ backgroundColor: passwordStrength.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${(passwordStrength.score + 1) * 20}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                    <span className="text-xs font-bold w-20 text-right" style={{ color: passwordStrength.color }}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Use at least 8 characters with uppercase, lowercase, numbers, and symbols
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="text-xs text-muted-foreground uppercase font-bold mb-2 block">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-muted-foreground" size={18} />
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="pl-10 pr-10 bg-background border-border text-foreground"
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                  disabled={isLoading}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Password Match Indicator */}
              {formData.confirmPassword && (
                <div className="mt-2 flex items-center gap-2">
                  {passwordsMatch ? (
                    <>
                      <Check size={16} className="text-green-600" />
                      <span className="text-xs text-green-600 font-medium">Passwords match</span>
                    </>
                  ) : (
                    <>
                      <X size={16} className="text-destructive" />
                      <span className="text-xs text-destructive font-medium">Passwords don&apos;t match</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Terms Agreement */}
            <div className="flex items-start gap-2 pt-2">
              <input
                type="checkbox"
                id="terms"
                name="agreeTerms"
                checked={formData.agreeTerms}
                onChange={handleInputChange}
                className="w-4 h-4 border-border bg-background cursor-pointer mt-1 flex-shrink-0"
                disabled={isLoading}
              />
              <label htmlFor="terms" className="text-xs text-muted-foreground cursor-pointer">
                I agree to the{' '}
                <a href="#" className="text-primary hover:text-primary/80 font-medium">Terms of Service</a>
                {' '}and{' '}
                <a href="#" className="text-primary hover:text-primary/80 font-medium">Privacy Policy</a>
              </label>
            </div>

            {/* Register Button */}
            <Button
              type="submit"
              disabled={!isFormValid || isLoading}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold h-10 mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Creating Account...
                </span>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>
        </motion.div>

        {/* Login Link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center"
        >
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <a href="/login" className="text-primary hover:text-primary/80 font-bold transition-colors">
              Sign in here
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
          <p>🔒 Enterprise-grade encryption and security standards applied to all accounts</p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Register;