import React, { useState } from 'react';
import { motion } from 'framer-motion';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Fingerprint, Shield, Mail, Smartphone, Key, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const Security = () => {
  const [twoFAEmail, setTwoFAEmail]       = useState(false);
  const [twoFASMS, setTwoFASMS]           = useState(false);
  const [sessionAlerts, setSessionAlerts] = useState(true);
  const [loginAlerts, setLoginAlerts]     = useState(true);
  const [phone, setPhone]                 = useState('');
  const [saving, setSaving]               = useState(false);
  const [sessions] = useState([
    { id: '1', device: 'Chrome on Windows',  ip: '197.248.x.x', location: 'Nairobi, KE', current: true,  time: 'Now' },
    { id: '2', device: 'Firefox on MacOS',   ip: '41.90.x.x',   location: 'Nairobi, KE', current: false, time: '2 hours ago' },
  ]);

  const save = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 900));
    toast.success('Security settings saved');
    setSaving(false);
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-5">

        <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
          className="border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-border bg-muted/30">
            <Fingerprint size={14} className="text-primary" />
            <span className="text-xs font-bold uppercase tracking-widest">Two-Factor Authentication</span>
          </div>
          <div className="px-5 py-5 space-y-5">
            <p className="text-xs text-muted-foreground">Add an extra layer of security to your account. You'll be asked for a second verification step when you log in.</p>

            <div className="flex items-center justify-between p-4 border border-border bg-muted/10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-primary/10 flex items-center justify-center">
                  <Mail size={16} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Email 2FA</p>
                  <p className="text-xs text-muted-foreground">Receive a code to your email address on each login</p>
                </div>
              </div>
              <Switch checked={twoFAEmail} onCheckedChange={v => { setTwoFAEmail(v); toast.info(v ? 'Email 2FA enabled' : 'Email 2FA disabled'); }} />
            </div>

            <div className="flex items-center justify-between p-4 border border-border bg-muted/10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-primary/10 flex items-center justify-center">
                  <Smartphone size={16} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">SMS 2FA</p>
                  <p className="text-xs text-muted-foreground">Receive a code via SMS to your phone number</p>
                </div>
              </div>
              <Switch checked={twoFASMS} onCheckedChange={v => { setTwoFASMS(v); }} />
            </div>

            {twoFASMS && (
              <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} className="overflow-hidden">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1.5">Phone Number</label>
                <Input value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="2547XXXXXXXX" className="bg-background border-border h-9 text-sm font-mono" />
              </motion.div>
            )}
          </div>
        </motion.div>

        <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.05 }}
          className="border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-border bg-muted/30">
            <Shield size={14} className="text-primary" />
            <span className="text-xs font-bold uppercase tracking-widest">Security Alerts</span>
          </div>
          <div className="px-5 py-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Login alerts</p>
                <p className="text-xs text-muted-foreground">Email me when a new device logs into my account</p>
              </div>
              <Switch checked={loginAlerts} onCheckedChange={setLoginAlerts} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Suspicious session alerts</p>
                <p className="text-xs text-muted-foreground">Notify me when a high-risk session is detected on my sites</p>
              </div>
              <Switch checked={sessionAlerts} onCheckedChange={setSessionAlerts} />
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.1 }}
          className="border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-border bg-muted/30">
            <Key size={14} className="text-primary" />
            <span className="text-xs font-bold uppercase tracking-widest">Active Sessions</span>
          </div>
          <div className="divide-y divide-border">
            {sessions.map(s => (
              <div key={s.id} className="px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {s.current
                    ? <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
                    : <AlertTriangle size={14} className="text-muted-foreground/50 flex-shrink-0" />}
                  <div>
                    <p className="text-xs font-semibold">{s.device} {s.current && <span className="text-green-500">(current)</span>}</p>
                    <p className="text-[10px] text-muted-foreground">{s.ip} · {s.location} · {s.time}</p>
                  </div>
                </div>
                {!s.current && (
                  <Button variant="outline" size="sm"
                    className="border-destructive text-destructive hover:bg-destructive/10 h-7 px-3 text-[10px]"
                    onClick={() => toast.success('Session revoked')}>
                    Revoke
                  </Button>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        <Button onClick={save} disabled={saving}
          className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold h-10 px-6 gap-2">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
          Save Security Settings
        </Button>

      </div>
    </DashboardLayout>
  );
};
export default Security;
