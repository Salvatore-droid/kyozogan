import React, { useState } from 'react';
import { motion } from 'framer-motion';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, User, Mail, Building2, Save, Crown, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { authFetch } from '@/lib/api';

const BASE_URL = 'http://localhost:8000/api';

const Profile = () => {
  const { user, isAdmin } = useAuth();
  const [saving, setSaving]   = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  const [form, setForm] = useState({
    full_name:    user?.full_name    || '',
    company_name: user?.company_name || '',
    email:        user?.email        || '',
  });
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await authFetch(`${BASE_URL}/auth/me/update/`, {
        method: 'PATCH',
        body: JSON.stringify({ full_name: form.full_name, company_name: form.company_name }),
      });
      if (res.ok) {
        toast.success('Profile updated');
        localStorage.setItem('user', JSON.stringify({ ...user, ...form }));
      } else {
        toast.error('Failed to update profile');
      }
    } catch { toast.error('Network error'); }
    finally { setSaving(false); }
  };

  const changePassword = async () => {
    if (pwForm.newPw !== pwForm.confirm) { toast.error('Passwords do not match'); return; }
    if (pwForm.newPw.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setPwSaving(true);
    try {
      const res = await authFetch(`${BASE_URL}/auth/me/change-password/`, {
        method: 'POST',
        body: JSON.stringify({ current_password: pwForm.current, new_password: pwForm.newPw }),
      });
      if (res.ok) {
        toast.success('Password changed successfully');
        setPwForm({ current: '', newPw: '', confirm: '' });
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to change password');
      }
    } catch { toast.error('Network error'); }
    finally { setPwSaving(false); }
  };

  const planColor = isAdmin ? '#D32F2F' : user?.plan === 'pro' ? '#0D7377' : user?.plan === 'enterprise' ? '#7B1FA2' : '#78909C';
  const planLabel = isAdmin ? 'Admin' : (user?.plan ? user.plan.charAt(0).toUpperCase() + user.plan.slice(1) : 'Free');

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-5">

        {/* Header card */}
        <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
          className="border border-border bg-card overflow-hidden">
          <div className="px-6 py-8 flex items-center gap-6">
            <div className="w-20 h-20 bg-primary/10 border-2 border-primary/20 flex items-center justify-center flex-shrink-0">
              <span className="text-3xl font-black text-primary">
                {(user?.full_name || user?.email || 'U')[0].toUpperCase()}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl font-black text-foreground">{user?.full_name || user?.email?.split('@')[0]}</h1>
                <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-sm flex items-center gap-1"
                  style={{ color: planColor, backgroundColor: planColor+'20', border:`1px solid ${planColor}40` }}>
                  {isAdmin && <Crown size={9} />} {planLabel}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              {user?.company_name && <p className="text-xs text-muted-foreground mt-0.5">{user.company_name}</p>}
            </div>
          </div>
        </motion.div>

        {/* Profile info */}
        <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.05 }}
          className="border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-border bg-muted/30">
            <User size={14} className="text-primary" />
            <span className="text-xs font-bold uppercase tracking-widest">Profile Information</span>
          </div>
          <div className="px-5 py-5 space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1.5">Full Name</label>
              <Input value={form.full_name} onChange={e => setForm(f => ({...f, full_name: e.target.value}))}
                placeholder="Your full name" className="bg-background border-border h-9 text-sm" />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1.5">Email</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={form.email} disabled
                  className="bg-muted border-border h-9 text-sm pl-9 text-muted-foreground cursor-not-allowed" />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Email cannot be changed</p>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1.5">Company / Organisation</label>
              <div className="relative">
                <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={form.company_name} onChange={e => setForm(f => ({...f, company_name: e.target.value}))}
                  placeholder="Your company" className="bg-background border-border h-9 text-sm pl-9" />
              </div>
            </div>
            <Button onClick={saveProfile} disabled={saving}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold h-9 px-5 text-sm gap-2">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save Changes
            </Button>
          </div>
        </motion.div>

        {/* Change password */}
        <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.1 }}
          className="border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-border bg-muted/30">
            <CheckCircle size={14} className="text-primary" />
            <span className="text-xs font-bold uppercase tracking-widest">Change Password</span>
          </div>
          <div className="px-5 py-5 space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1.5">Current Password</label>
              <Input type="password" value={pwForm.current} onChange={e => setPwForm(f => ({...f, current: e.target.value}))}
                placeholder="••••••••" className="bg-background border-border h-9 text-sm" />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1.5">New Password</label>
              <Input type="password" value={pwForm.newPw} onChange={e => setPwForm(f => ({...f, newPw: e.target.value}))}
                placeholder="••••••••" className="bg-background border-border h-9 text-sm" />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1.5">Confirm New Password</label>
              <Input type="password" value={pwForm.confirm} onChange={e => setPwForm(f => ({...f, confirm: e.target.value}))}
                placeholder="••••••••" className="bg-background border-border h-9 text-sm" />
            </div>
            <Button onClick={changePassword} disabled={pwSaving} variant="outline"
              className="border-border font-bold h-9 px-5 text-sm gap-2">
              {pwSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Update Password
            </Button>
          </div>
        </motion.div>

      </div>
    </DashboardLayout>
  );
};
export default Profile;
