import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
  CreditCard, Zap, Building2, CheckCircle, Clock, Shield,
  Smartphone, Globe, RefreshCw, AlertTriangle, Crown,
  ChevronRight, ArrowRight, Sparkles, Lock, Receipt,
  TrendingUp, Users, Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Plan definitions (mirror PaymentModal) ───────────────────────────────────

const PLANS = [
  {
    key:      'pro',
    name:     'Pro',
    usd:      29,
    kes:      3800,
    icon:     Zap,
    color:    '#0D7377',
    tagline:  'For growing teams protecting real sites',
    features: [
      '10 registered sites',
      '5,000 monitored sessions / mo',
      'Three-tier AI threat evaluation',
      'Seamless decoy backend swap',
      'Email & dashboard alerts',
      'Standard support',
    ],
  },
  {
    key:      'enterprise',
    name:     'Enterprise',
    usd:      99,
    kes:      13000,
    icon:     Building2,
    color:    '#7B1FA2',
    tagline:  'Unlimited protection for serious operations',
    popular:  true,
    features: [
      'Unlimited registered sites',
      'Unlimited sessions',
      'Priority Groq AI analysis',
      'Full reverse-proxy mode',
      'Custom SDK integrations',
      'Dedicated support & SLA',
    ],
  },
];

type Step = 'plans' | 'method' | 'mpesa' | 'paypal' | 'polling' | 'success';

interface Subscription {
  plan: string;
  plan_name: string;
  is_active: boolean;
  is_admin: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function PlanBadge({ plan }: { plan: string }) {
  const colors: Record<string, { color: string; bg: string; label: string; icon: React.ElementType }> = {
    free:       { color: '#78909C', bg: '#78909C20', label: 'Free',       icon: Shield },
    pro:        { color: '#0D7377', bg: '#0D737720', label: 'Pro',        icon: Zap },
    enterprise: { color: '#7B1FA2', bg: '#7B1FA220', label: 'Enterprise', icon: Crown },
  };
  const cfg = colors[plan] || colors.free;
  const Icon = cfg.icon;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold uppercase tracking-wider border"
      style={{ color: cfg.color, backgroundColor: cfg.bg, borderColor: cfg.color + '40' }}>
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}

// ─── Billing History Row ──────────────────────────────────────────────────────

interface Payment {
  id: string;
  amount_usd: number;
  amount_kes: number;
  plan: string;
  method: string;
  status: string;
  created_at: string;
}

function PaymentRow({ p }: { p: Payment }) {
  const isOk = p.status === 'completed';
  return (
    <div className="flex items-center gap-4 px-5 py-3.5 border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
        isOk ? 'bg-green-500/15' : 'bg-yellow-500/15')}>
        {isOk
          ? <CheckCircle size={14} className="text-green-500" />
          : <Clock size={14} className="text-yellow-500" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground capitalize">{p.plan} Plan</p>
        <p className="text-[11px] text-muted-foreground capitalize">{p.method?.replace('_', ' ')} · {new Date(p.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-bold font-mono text-foreground">${p.amount_usd}</p>
        <p className="text-[11px] text-muted-foreground font-mono">KES {p.amount_kes?.toLocaleString()}</p>
      </div>
      <span className={cn('text-[10px] font-bold uppercase px-2 py-0.5 border',
        isOk
          ? 'text-green-500 border-green-500/30 bg-green-500/10'
          : 'text-yellow-500 border-yellow-500/30 bg-yellow-500/10')}>
        {p.status}
      </span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Billing() {
  const { user, isAdmin } = useAuth();

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments]         = useState<Payment[]>([]);
  const [subLoading, setSubLoading]     = useState(true);
  const [payLoading, setPayLoading]     = useState(true);

  // Checkout flow state
  const [step, setStep]             = useState<Step>('plans');
  const [selectedPlan, setSelectedPlan] = useState('pro');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [phone, setPhone]           = useState('');
  const [checkoutId, setCheckoutId] = useState('');
  const [pollCount, setPollCount]   = useState(0);
  const [paypalUrl, setPaypalUrl]   = useState('');

  // Fetch subscription
  useEffect(() => {
    api.getSubscription()
      .then(s => setSubscription(s as unknown as Subscription))
      .catch(() => {})
      .finally(() => setSubLoading(false));
  }, []);

  // Fetch payment history
  useEffect(() => {
    fetch('/api/payments/history/', {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
    })
      .then(r => r.ok ? r.json() : [])
      .then(d => setPayments(Array.isArray(d) ? d : d.results || []))
      .catch(() => {})
      .finally(() => setPayLoading(false));
  }, []);

  // Poll M-Pesa
  useEffect(() => {
    if (step !== 'polling' || !checkoutId) return;
    const id = setInterval(async () => {
      try {
        const r = await fetch(`/api/payments/mpesa/status/${checkoutId}/`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
        });
        const d = await r.json();
        if (d.status === 'completed') {
          clearInterval(id);
          setStep('success');
          toast.success('Payment successful! Your plan has been upgraded.');
          // Refresh subscription
          api.getSubscription().then(s => setSubscription(s as unknown as Subscription)).catch(() => {});
        } else if (d.status === 'failed') {
          clearInterval(id);
          toast.error('Payment failed. Please try again.');
          setStep('mpesa');
        }
      } catch {}
      setPollCount(c => c + 1);
      if (pollCount > 24) { clearInterval(id); setStep('mpesa'); }
    }, 5000);
    return () => clearInterval(id);
  }, [step, checkoutId, pollCount]);

  const handleMpesa = async () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 9) { toast.error('Enter a valid phone number'); return; }
    setCheckoutLoading(true);
    try {
      const r = await fetch('/api/payments/mpesa/stk/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({ phone_number: digits, plan: selectedPlan }),
      });
      const d = await r.json();
      if (r.ok && d.checkout_request_id) {
        setCheckoutId(d.checkout_request_id);
        setPollCount(0);
        setStep('polling');
        toast.info('STK push sent — check your phone');
      } else {
        toast.error(d.error || 'Failed to initiate M-Pesa payment');
      }
    } catch { toast.error('Network error'); }
    finally { setCheckoutLoading(false); }
  };

  const handlePayPal = async () => {
    setCheckoutLoading(true);
    try {
      const r = await fetch('/api/payments/paypal/create/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({ plan: selectedPlan }),
      });
      const d = await r.json();
      if (r.ok && d.approval_url) {
        setPaypalUrl(d.approval_url);
        setStep('paypal');
      } else {
        toast.error(d.error || 'Failed to create PayPal order');
      }
    } catch { toast.error('Network error'); }
    finally { setCheckoutLoading(false); }
  };

  const resetCheckout = () => {
    setStep('plans');
    setPhone('');
    setCheckoutId('');
    setPaypalUrl('');
    setPollCount(0);
  };

  const currentPlan = subscription?.plan || user?.plan || 'free';
  const planObj     = PLANS.find(p => p.key === selectedPlan)!;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8">

        {/* ── Page header ───────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-widest text-foreground">
              Billing & Subscription
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your Genius Mirage protection plan
            </p>
          </div>
          {!subLoading && <PlanBadge plan={currentPlan} />}
        </motion.div>

        {/* ── Current plan summary ──────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-border bg-muted/30">
            <Receipt size={14} className="text-primary" />
            <span className="text-[11px] font-bold uppercase tracking-widest">Current Plan</span>
          </div>
          {subLoading ? (
            <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground text-sm">
              <RefreshCw size={14} className="animate-spin" /> Loading…
            </div>
          ) : (
            <div className="flex items-center gap-6 px-5 py-5 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  {currentPlan === 'enterprise' ? <Crown size={18} className="text-primary" /> :
                   currentPlan === 'pro'        ? <Zap   size={18} className="text-primary" /> :
                                                  <Shield size={18} className="text-primary" />}
                </div>
                <div>
                  <p className="text-lg font-black text-foreground capitalize">{currentPlan} Plan</p>
                  <p className="text-xs text-muted-foreground">
                    {subscription?.is_active ? 'Active' : 'Inactive'} ·{' '}
                    {isAdmin ? 'Admin account' : subscription?.plan_name || '—'}
                  </p>
                </div>
              </div>
              <div className="flex gap-4 ml-auto flex-wrap">
                {[
                  { icon: Globe,    label: 'Sites',    value: currentPlan === 'enterprise' ? '∞' : currentPlan === 'pro' ? '10' : '1' },
                  { icon: Activity, label: 'Sessions', value: currentPlan === 'enterprise' ? '∞' : currentPlan === 'pro' ? '5K/mo' : '100/mo' },
                  { icon: Shield,   label: 'AI Tiers', value: currentPlan === 'free' ? '2' : '3' },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="text-center px-4 border-l border-border first:border-l-0">
                    <Icon size={13} className="text-muted-foreground mx-auto mb-1" />
                    <p className="text-base font-black font-mono text-foreground">{value}</p>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
              {currentPlan === 'free' && (
                <Button size="sm" className="ml-auto" onClick={() => { setStep('plans'); }}>
                  <Sparkles size={13} className="mr-1.5" /> Upgrade Now
                </Button>
              )}
            </div>
          )}
        </motion.div>

        {/* ── Checkout flow ─────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2.5">
              <CreditCard size={14} className="text-primary" />
              <span className="text-[11px] font-bold uppercase tracking-widest">
                {step === 'success' ? 'Payment Successful' : 'Choose a Plan'}
              </span>
            </div>
            {step !== 'plans' && step !== 'success' && (
              <button onClick={resetCheckout}
                className="text-[10px] text-muted-foreground hover:text-foreground uppercase tracking-widest transition-colors">
                ← Back to plans
              </button>
            )}
          </div>

          <AnimatePresence mode="wait">

            {/* ── Step: Plans ── */}
            {step === 'plans' && (
              <motion.div key="plans"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="p-6">
                <div className="grid md:grid-cols-2 gap-4">
                  {PLANS.map((plan) => {
                    const Icon = plan.icon;
                    const isCurrent  = currentPlan === plan.key;
                    const isSelected = selectedPlan === plan.key;
                    return (
                      <button key={plan.key}
                        onClick={() => setSelectedPlan(plan.key)}
                        className={cn(
                          'text-left p-5 border-2 transition-all duration-200 relative group',
                          isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-border/80 hover:bg-muted/20',
                          isCurrent && 'ring-1 ring-green-500/40'
                        )}>
                        {(plan as any).popular && (
                          <span className="absolute -top-2.5 left-4 text-[9px] font-black uppercase tracking-widest px-2 py-0.5"
                            style={{ backgroundColor: plan.color, color: '#fff' }}>
                            Most Popular
                          </span>
                        )}
                        {isCurrent && (
                          <span className="absolute top-3 right-3 text-[9px] font-bold uppercase px-2 py-0.5 bg-green-500/15 text-green-500 border border-green-500/30">
                            Current
                          </span>
                        )}
                        <div className="flex items-start gap-3 mb-4">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: plan.color + '20' }}>
                            <Icon size={16} style={{ color: plan.color }} />
                          </div>
                          <div>
                            <p className="text-base font-black text-foreground">{plan.name}</p>
                            <p className="text-[11px] text-muted-foreground">{plan.tagline}</p>
                          </div>
                        </div>
                        <div className="mb-4">
                          <span className="text-3xl font-black font-mono text-foreground">${plan.usd}</span>
                          <span className="text-muted-foreground text-sm"> / mo</span>
                          <span className="ml-2 text-[11px] text-muted-foreground font-mono">
                            (KES {plan.kes.toLocaleString()})
                          </span>
                        </div>
                        <ul className="space-y-1.5">
                          {plan.features.map(f => (
                            <li key={f} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                              <CheckCircle size={11} style={{ color: plan.color, flexShrink: 0 }} />
                              {f}
                            </li>
                          ))}
                        </ul>
                        {isSelected && (
                          <div className="mt-4 pt-3 border-t border-border">
                            <div className="flex items-center gap-1.5 text-[11px] text-primary font-semibold">
                              <CheckCircle size={11} /> Selected
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {currentPlan !== selectedPlan && (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    className="mt-4 flex items-center justify-between px-5 py-4 border border-primary/30 bg-primary/5">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Upgrade to {planObj.name} — ${planObj.usd}/mo
                      </p>
                      <p className="text-[11px] text-muted-foreground">Select a payment method to continue</p>
                    </div>
                    <Button size="sm" onClick={() => setStep('method')}
                      style={{ backgroundColor: planObj.color }}
                      className="text-white border-0 hover:opacity-90">
                      Continue <ArrowRight size={13} className="ml-1.5" />
                    </Button>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* ── Step: Method ── */}
            {step === 'method' && (
              <motion.div key="method"
                initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
                className="p-6 max-w-md">
                <p className="text-sm text-muted-foreground mb-5">
                  Upgrading to <span className="font-bold text-foreground">{planObj.name}</span> —
                  ${planObj.usd}/mo (KES {planObj.kes.toLocaleString()})
                </p>
                <div className="space-y-3">
                  <button onClick={() => setStep('mpesa')}
                    className="w-full flex items-center gap-4 px-5 py-4 border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left group">
                    <div className="w-10 h-10 rounded-full bg-green-500/15 flex items-center justify-center flex-shrink-0">
                      <Smartphone size={18} className="text-green-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-foreground">M-Pesa STK Push</p>
                      <p className="text-[11px] text-muted-foreground">Pay via Safaricom M-Pesa · Kenya only</p>
                    </div>
                    <ChevronRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>
                  <button onClick={handlePayPal}
                    disabled={checkoutLoading}
                    className="w-full flex items-center gap-4 px-5 py-4 border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left group disabled:opacity-60">
                    <div className="w-10 h-10 rounded-full bg-blue-500/15 flex items-center justify-center flex-shrink-0">
                      <Globe size={18} className="text-blue-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-foreground">PayPal</p>
                      <p className="text-[11px] text-muted-foreground">Pay via PayPal · International</p>
                    </div>
                    {checkoutLoading
                      ? <RefreshCw size={14} className="animate-spin text-muted-foreground" />
                      : <ChevronRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />}
                  </button>
                </div>
                <p className="mt-4 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <Lock size={10} /> Payments are processed securely. Genius Mirage never stores card details.
                </p>
              </motion.div>
            )}

            {/* ── Step: M-Pesa ── */}
            {step === 'mpesa' && (
              <motion.div key="mpesa"
                initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
                className="p-6 max-w-sm">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-full bg-green-500/15 flex items-center justify-center">
                    <Smartphone size={18} className="text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">M-Pesa STK Push</p>
                    <p className="text-[11px] text-muted-foreground">KES {planObj.kes.toLocaleString()}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">
                      Safaricom Number
                    </label>
                    <Input
                      placeholder="e.g. 0712345678"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleMpesa()}
                      className="font-mono"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Enter your M-Pesa registered number — you'll receive an STK push prompt.
                    </p>
                  </div>
                  <Button className="w-full" onClick={handleMpesa} disabled={checkoutLoading}
                    style={{ backgroundColor: planObj.color }}>
                    {checkoutLoading
                      ? <><RefreshCw size={14} className="animate-spin mr-2" /> Sending…</>
                      : <>Send STK Push <ArrowRight size={14} className="ml-2" /></>}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ── Step: PayPal redirect ── */}
            {step === 'paypal' && paypalUrl && (
              <motion.div key="paypal"
                initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
                className="p-6 max-w-sm">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-full bg-blue-500/15 flex items-center justify-center">
                    <Globe size={18} className="text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">Complete on PayPal</p>
                    <p className="text-[11px] text-muted-foreground">${planObj.usd} / month</p>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground mb-4">
                  Click below to complete your payment on PayPal. You'll be redirected back once done.
                </p>
                <a href={paypalUrl} target="_blank" rel="noopener noreferrer">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white border-0">
                    Open PayPal <ArrowRight size={14} className="ml-2" />
                  </Button>
                </a>
                <Button variant="outline" className="w-full mt-2" onClick={resetCheckout}>
                  Cancel
                </Button>
              </motion.div>
            )}

            {/* ── Step: Polling ── */}
            {step === 'polling' && (
              <motion.div key="polling"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-14 px-6 text-center">
                <div className="relative mb-5">
                  <div className="w-16 h-16 rounded-full border-4 border-green-500/20 flex items-center justify-center">
                    <Smartphone size={28} className="text-green-500" />
                  </div>
                  <div className="absolute inset-0 rounded-full border-4 border-t-green-500 animate-spin border-transparent" />
                </div>
                <p className="text-base font-bold text-foreground mb-1">Waiting for payment…</p>
                <p className="text-[11px] text-muted-foreground max-w-xs">
                  Check your phone for the M-Pesa prompt and enter your PIN to complete the payment.
                </p>
                <p className="mt-4 text-[10px] text-muted-foreground font-mono">
                  Checking status · {pollCount * 5}s elapsed
                </p>
                <Button variant="outline" size="sm" className="mt-4"
                  onClick={() => setStep('mpesa')}>
                  Cancel
                </Button>
              </motion.div>
            )}

            {/* ── Step: Success ── */}
            {step === 'success' && (
              <motion.div key="success"
                initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-14 px-6 text-center">
                <div className="w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center mb-4">
                  <CheckCircle size={32} className="text-green-500" />
                </div>
                <p className="text-xl font-black text-foreground mb-1">You're all set!</p>
                <p className="text-sm text-muted-foreground mb-5">
                  Your account has been upgraded to{' '}
                  <span className="font-bold text-foreground">{planObj.name}</span>.
                </p>
                <Button onClick={resetCheckout} variant="outline" size="sm">
                  View plans again
                </Button>
              </motion.div>
            )}

          </AnimatePresence>
        </motion.div>

        {/* ── Payment History ───────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-border bg-muted/30">
            <TrendingUp size={14} className="text-primary" />
            <span className="text-[11px] font-bold uppercase tracking-widest">Payment History</span>
            <span className="ml-auto text-[10px] text-muted-foreground">{payments.length} records</span>
          </div>
          {payLoading ? (
            <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground text-sm">
              <RefreshCw size={14} className="animate-spin" /> Loading…
            </div>
          ) : payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Receipt size={28} className="mb-3 opacity-20" />
              <p className="text-sm">No payment records yet</p>
              <p className="text-xs mt-1">Your billing history will appear here after your first payment</p>
            </div>
          ) : (
            <div>
              {payments.map(p => <PaymentRow key={p.id} p={p} />)}
            </div>
          )}
        </motion.div>

        {/* ── Security note ─────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          className="flex items-center gap-3 px-4 py-3 border border-border bg-muted/10">
          <Lock size={13} className="text-muted-foreground flex-shrink-0" />
          <p className="text-[11px] text-muted-foreground">
            All payments are processed securely via M-Pesa and PayPal. Genius Mirage never stores
            payment credentials. Contact support if you have any billing questions.
          </p>
        </motion.div>

      </div>
    </DashboardLayout>
  );
}
