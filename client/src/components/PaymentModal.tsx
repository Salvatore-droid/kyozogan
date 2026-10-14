import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, CheckCircle, AlertCircle, Smartphone, CreditCard, Shield, Zap, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { toast } from 'sonner';

/* ─── Plan definitions ───────────────────────────────────────── */
const PLANS = [
  {
    key:      'pro',
    name:     'Pro',
    usd:      29,
    kes:      3800,
    icon:     Zap,
    color:    '#0D7377',
    features: ['10 registered sites', '5,000 sessions/mo', 'AI threat analysis', 'Email alerts'],
  },
  {
    key:      'enterprise',
    name:     'Enterprise',
    usd:      99,
    kes:      13000,
    icon:     Building2,
    color:    '#7B1FA2',
    features: ['Unlimited sites', 'Unlimited sessions', 'Priority AI analysis', 'Dedicated support', 'Custom integrations'],
  },
];

type PaymentMethod = 'mpesa' | 'paypal' | null;
type Step = 'plans' | 'method' | 'mpesa' | 'paypal' | 'polling' | 'success';

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  /** If true the user dismissed it voluntarily (don't re-show for a while) */
  onDismiss: () => void;
}

export default function PaymentModal({ open, onClose, onDismiss }: PaymentModalProps) {
  const { user, isAdmin } = useAuth();
  const [step, setStep]         = useState<Step>('plans');
  const [selectedPlan, setPlan] = useState<string>('pro');
  const [method, setMethod]     = useState<PaymentMethod>(null);
  const [phone, setPhone]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [checkoutId, setCheckoutId] = useState('');
  const [pollCount, setPollCount]   = useState(0);
  const [paypalUrl, setPaypalUrl]   = useState('');

  // Reset when modal opens
  useEffect(() => {
    if (open) { setStep('plans'); setMethod(null); setPhone(''); setLoading(false); }
  }, [open]);

  // Poll M-Pesa status
  useEffect(() => {
    if (step !== 'polling' || !checkoutId) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/payments/mpesa/status/${checkoutId}/`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
        });
        const data = await res.json();
        if (data.status === 'completed') {
          clearInterval(interval);
          setStep('success');
          toast.success('Payment confirmed! Your plan has been upgraded.');
          setTimeout(() => { onClose(); window.location.reload(); }, 2500);
        } else if (data.status === 'failed') {
          clearInterval(interval);
          toast.error('Payment failed or was cancelled.');
          setStep('mpesa');
        }
      } catch {}
      setPollCount(c => c + 1);
    }, 3000);

    // Stop polling after 2 minutes
    const timeout = setTimeout(() => {
      clearInterval(interval);
      if (step === 'polling') {
        toast.error('Payment timed out. Please try again.');
        setStep('mpesa');
      }
    }, 120000);

    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, [step, checkoutId]);

  const plan = PLANS.find(p => p.key === selectedPlan)!;

  const handleMpesaPay = async () => {
    if (!phone.trim()) { toast.error('Enter your M-Pesa phone number'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/payments/mpesa/stk/', {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          Authorization:   `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({ plan: selectedPlan, phone: phone.replace(/\s+/g, '') }),
      });
      const data = await res.json();
      if (data.ok) {
        setCheckoutId(data.checkout_request_id);
        setStep('polling');
      } else {
        toast.error(data.error || 'STK push failed');
      }
    } catch (e: any) {
      toast.error('Network error — try again');
    } finally {
      setLoading(false);
    }
  };

  const handlePaypalPay = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/payments/paypal/create/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({ plan: selectedPlan }),
      });
      const data = await res.json();
      if (data.ok && data.approve_url) {
        window.open(data.approve_url, '_blank', 'width=600,height=700');
        setStep('paypal');
      } else {
        toast.error(data.error || 'PayPal order creation failed');
      }
    } catch {
      toast.error('Network error — try again');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.95, y: 12, opacity: 0 }}
          animate={{ scale: 1,    y: 0,  opacity: 1 }}
          exit={{   scale: 0.95, y: 12, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-card border border-border w-full max-w-lg overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/20">
            <div className="flex items-center gap-2.5">
              <Shield size={16} className="text-primary" />
              <span className="text-sm font-black uppercase tracking-tight">Upgrade Your Plan</span>
            </div>
            <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground transition-colors">
              <X size={16} />
            </button>
          </div>

          <div className="px-6 py-5">

            {/* ── Step: Plans ──────────────────────────────────────────────── */}
            {step === 'plans' && (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  You're on the <span className="font-bold text-foreground">Free</span> plan.
                  Upgrade to unlock more sites and sessions.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {PLANS.map(p => {
                    const Icon = p.icon;
                    const selected = selectedPlan === p.key;
                    return (
                      <button key={p.key} onClick={() => setPlan(p.key)}
                        className={`text-left p-4 border transition-all ${selected ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/40'}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <Icon size={14} style={{ color: p.color }} />
                          <span className="text-xs font-bold uppercase tracking-widest">{p.name}</span>
                        </div>
                        <p className="text-xl font-black font-mono">${p.usd}<span className="text-xs font-normal text-muted-foreground">/mo</span></p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">KES {p.kes.toLocaleString()}/mo</p>
                        <ul className="mt-3 space-y-1">
                          {p.features.map((f, i) => (
                            <li key={i} className="text-[10px] text-foreground/70 flex items-center gap-1.5">
                              <span style={{ color: p.color }}>✓</span> {f}
                            </li>
                          ))}
                        </ul>
                      </button>
                    );
                  })}
                </div>
                <Button onClick={() => setStep('method')}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold h-10">
                  Continue with {plan.name} — ${plan.usd}/mo
                </Button>
                <p className="text-center text-[10px] text-muted-foreground">Cancel anytime. No hidden fees.</p>
              </div>
            )}

            {/* ── Step: Choose payment method ───────────────────────────────── */}
            {step === 'method' && (
              <div className="space-y-4">
                <button onClick={() => setStep('plans')} className="text-[10px] text-muted-foreground hover:text-foreground">← Back</button>
                <p className="text-xs font-semibold">How would you like to pay for <span className="text-primary">{plan.name}</span>?</p>
                <div className="space-y-2">
                  <button onClick={() => setStep('mpesa')}
                    className="w-full flex items-center gap-4 p-4 border border-border hover:border-green-500/50 hover:bg-green-500/5 transition-all text-left">
                    <div className="w-10 h-10 bg-green-600 flex items-center justify-center flex-shrink-0">
                      <Smartphone size={18} className="text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">M-Pesa</p>
                      <p className="text-[11px] text-muted-foreground">STK push to your phone · KES {plan.kes.toLocaleString()}/mo</p>
                    </div>
                  </button>
                  <button onClick={() => setStep('paypal')}
                    className="w-full flex items-center gap-4 p-4 border border-border hover:border-blue-500/50 hover:bg-blue-500/5 transition-all text-left">
                    <div className="w-10 h-10 bg-[#003087] flex items-center justify-center flex-shrink-0">
                      <CreditCard size={18} className="text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">PayPal</p>
                      <p className="text-[11px] text-muted-foreground">Pay with PayPal or card · USD ${plan.usd}/mo</p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* ── Step: M-Pesa form ────────────────────────────────────────── */}
            {step === 'mpesa' && (
              <div className="space-y-4">
                <button onClick={() => setStep('method')} className="text-[10px] text-muted-foreground hover:text-foreground">← Back</button>
                <div className="flex items-center gap-3 p-3 bg-green-600/10 border border-green-600/20">
                  <Smartphone size={20} className="text-green-500 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-green-500">M-Pesa STK Push</p>
                    <p className="text-[11px] text-muted-foreground">You'll receive a prompt on your phone. Enter your M-Pesa PIN to pay.</p>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1.5">
                    M-Pesa Phone Number
                  </label>
                  <Input
                    placeholder="2547XXXXXXXX"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="bg-background border-border h-10 font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">Format: 2547XXXXXXXX (no + or spaces)</p>
                </div>
                <div className="flex items-center justify-between p-3 border border-border bg-muted/20">
                  <span className="text-xs text-muted-foreground">{plan.name} plan</span>
                  <span className="text-sm font-black font-mono">KES {plan.kes.toLocaleString()}/mo</span>
                </div>
                <Button onClick={handleMpesaPay} disabled={loading}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold h-10 gap-2">
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Smartphone size={14} />}
                  Send STK Push
                </Button>
              </div>
            )}

            {/* ── Step: PayPal ────────────────────────────────────────────── */}
            {step === 'paypal' && !paypalUrl && (
              <div className="space-y-4">
                <button onClick={() => setStep('method')} className="text-[10px] text-muted-foreground hover:text-foreground">← Back</button>
                <div className="flex items-center gap-3 p-3 bg-blue-600/10 border border-blue-600/20">
                  <CreditCard size={20} className="text-blue-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-blue-400">PayPal Checkout</p>
                    <p className="text-[11px] text-muted-foreground">A PayPal window will open. Complete payment there and return here.</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 border border-border bg-muted/20">
                  <span className="text-xs text-muted-foreground">{plan.name} plan</span>
                  <span className="text-sm font-black font-mono">${plan.usd}/mo</span>
                </div>
                <Button onClick={handlePaypalPay} disabled={loading}
                  className="w-full bg-[#003087] hover:bg-[#002060] text-white font-bold h-10 gap-2">
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
                  Pay with PayPal
                </Button>
                <p className="text-center text-[10px] text-muted-foreground">
                  After paying in the PayPal window, come back here and click below.
                </p>
                <Button variant="outline" onClick={() => { setStep('success'); }}
                  className="w-full border-border text-foreground/70 h-9 text-xs">
                  I've completed payment in PayPal
                </Button>
              </div>
            )}

            {/* ── Step: Polling ───────────────────────────────────────────── */}
            {step === 'polling' && (
              <div className="text-center py-8 space-y-4">
                <div className="relative w-16 h-16 mx-auto">
                  <div className="absolute inset-0 border-4 border-green-500/20 rounded-full" />
                  <div className="absolute inset-0 border-4 border-t-green-500 rounded-full animate-spin" />
                  <Smartphone size={20} className="absolute inset-0 m-auto text-green-500" />
                </div>
                <div>
                  <p className="text-sm font-bold">Waiting for payment…</p>
                  <p className="text-xs text-muted-foreground mt-1">Check your phone and enter your M-Pesa PIN</p>
                  <p className="text-[10px] text-muted-foreground mt-3">
                    Checking status ({pollCount * 3}s)…
                  </p>
                </div>
                <Button variant="outline" onClick={() => setStep('mpesa')}
                  className="border-border text-foreground/60 h-8 px-4 text-xs">
                  Cancel
                </Button>
              </div>
            )}

            {/* ── Step: Success ───────────────────────────────────────────── */}
            {step === 'success' && (
              <div className="text-center py-8 space-y-3">
                <CheckCircle size={40} className="mx-auto text-green-500" />
                <p className="text-sm font-bold">Payment confirmed!</p>
                <p className="text-xs text-muted-foreground">
                  Your account has been upgraded to <span className="text-primary font-bold">{plan.name}</span>.
                  Reloading…
                </p>
              </div>
            )}

          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
