import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Settings as SettingsIcon, User, Lock, Palette, Save, Eye, EyeOff,
  MapPin, Link as LinkIcon, Type, FileText, Camera, Sun, Moon, Check, Loader2,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import Avatar from '../components/ui/Avatar.jsx';
import { FullSpinner } from '../components/ui/Loading.jsx';

const TABS = [
  { key: 'profile', label: '个人资料', icon: User },
  { key: 'password', label: '修改密码', icon: Lock },
  { key: 'appearance', label: '外观', icon: Palette },
];

export default function Settings() {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const { theme, toggleTheme } = useTheme();
  const [tab, setTab] = useState('profile');
  const [loading, setLoading] = useState(true);

  const [profile, setProfile] = useState({
    displayName: '', bio: '', signature: '', title: '', location: '', website: '', avatar: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [pwd, setPwd] = useState({ oldPassword: '', newPassword: '', confirm: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  useEffect(() => {
    api.me()
      .then(u => {
        setProfile({
          displayName: u.displayName || '',
          bio: u.bio || '',
          signature: u.signature || '',
          title: u.title || '',
          location: u.location || '',
          website: u.website || '',
          avatar: u.avatar || '',
        });
      })
      .catch(e => toast(e.message || '加载资料失败', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) { toast('图片不能超过 4MB', 'error'); return; }
    setUploading(true);
    try {
      const res = await api.uploadImage(file);
      const url = res.url || res.data?.url || res.path;
      setProfile(p => ({ ...p, avatar: url }));
      toast('头像上传成功', 'success');
    } catch (err) {
      toast(err.message || '上传失败', 'error');
    } finally {
      setUploading(false);
    }
  };

  const saveProfile = async () => {
    if (!profile.displayName.trim()) { toast('昵称不能为空', 'error'); return; }
    setSavingProfile(true);
    try {
      const updated = await api.updateMe({
        displayName: profile.displayName.trim(),
        bio: profile.bio,
        signature: profile.signature,
        title: profile.title,
        location: profile.location,
        website: profile.website,
        avatar: profile.avatar,
      });
      updateUser(updated);
      toast('资料已保存', 'success');
    } catch (e) {
      toast(e.message || '保存失败', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async () => {
    if (!pwd.oldPassword || !pwd.newPassword) { toast('请填写完整', 'error'); return; }
    if (pwd.newPassword.length < 6) { toast('新密码至少 6 位', 'error'); return; }
    if (pwd.newPassword !== pwd.confirm) { toast('两次密码不一致', 'error'); return; }
    setSavingPwd(true);
    try {
      await api.changePassword({ oldPassword: pwd.oldPassword, newPassword: pwd.newPassword });
      setPwd({ oldPassword: '', newPassword: '', confirm: '' });
      toast('密码修改成功', 'success');
    } catch (e) {
      toast(e.message || '修改失败', 'error');
    } finally {
      setSavingPwd(false);
    }
  };

  if (loading) {
    return <div className="max-w-4xl mx-auto px-3 sm:px-5 py-6"><FullSpinner /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="max-w-4xl mx-auto px-3 sm:px-5 py-6">
        {/* Header */}
        <div className="relative overflow-hidden card p-6 mb-6">
          <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full blur-3xl opacity-25" style={{ background: 'radial-gradient(circle, #6366f1, transparent)' }} />
          <div className="relative flex items-center gap-4">
            <div className="p-3 rounded-2xl shrink-0" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(6,182,212,0.16))', border: '1px solid rgba(99,102,241,0.3)' }}>
              <SettingsIcon size={24} className="text-brand-400" />
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold">账户<span className="gradient-text">设置</span></h1>
              <p className="text-muted text-sm mt-1">管理你的个人信息、安全与外观偏好。</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-6">
          {/* Sidebar tabs */}
          <div className="sm:w-48 shrink-0">
            <div className="flex sm:flex-col gap-1 glass rounded-xl p-1 sm:sticky sm:top-20">
              {TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition flex-1 sm:flex-none justify-center sm:justify-start ${tab === t.key ? 'btn-primary' : 'hover:bg-surface-2 text-muted'}`}
                >
                  <t.icon size={16} /> {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {tab === 'profile' && (
              <Section title="个人资料" desc="这些信息会展示在你的个人主页上。">
                {/* Avatar preview */}
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-default">
                  <Avatar user={{ ...user, avatar: profile.avatar, username: user?.username }} size={80} showStatus ring />
                  <div>
                    <label className="btn-primary px-4 py-2 rounded-xl inline-flex items-center gap-2 text-sm cursor-pointer">
                      {uploading ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />}
                      {uploading ? '上传中…' : '更换头像'}
                      <input type="file" accept="image/*" className="hidden" onChange={onUpload} disabled={uploading} />
                    </label>
                    <p className="text-xs text-muted mt-2">支持 JPG / PNG，最大 4MB。</p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="昵称" icon={User}>
                    <input className="input-field" value={profile.displayName} onChange={e => setProfile(p => ({ ...p, displayName: e.target.value }))} placeholder="你的显示名称" />
                  </Field>
                  <Field label="头衔" icon={Type}>
                    <input className="input-field" value={profile.title} onChange={e => setProfile(p => ({ ...p, title: e.target.value }))} placeholder="如：前端工程师" />
                  </Field>
                  <Field label="所在地" icon={MapPin}>
                    <input className="input-field" value={profile.location} onChange={e => setProfile(p => ({ ...p, location: e.target.value }))} placeholder="如：上海" />
                  </Field>
                  <Field label="网站" icon={LinkIcon}>
                    <input className="input-field" value={profile.website} onChange={e => setProfile(p => ({ ...p, website: e.target.value }))} placeholder="https://" />
                  </Field>
                  <Field label="个性签名" icon={Type} full>
                    <input className="input-field" value={profile.signature} onChange={e => setProfile(p => ({ ...p, signature: e.target.value }))} placeholder="一句话介绍自己" />
                  </Field>
                  <Field label="个人简介" icon={FileText} full>
                    <textarea className="input-field min-h-[100px] resize-y" value={profile.bio} onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))} placeholder="介绍一下你自己，支持纯文本…" />
                  </Field>
                </div>

                <div className="flex justify-end mt-6">
                  <SaveButton loading={savingProfile} onClick={saveProfile} label="保存资料" />
                </div>
              </Section>
            )}

            {tab === 'password' && (
              <Section title="修改密码" desc="定期更换密码以保障账户安全。">
                <div className="grid gap-4 max-w-md">
                  <Field label="当前密码" icon={Lock}>
                    <div className="relative">
                      <input type={showPwd ? 'text' : 'password'} className="input-field pr-10" value={pwd.oldPassword} onChange={e => setPwd(p => ({ ...p, oldPassword: e.target.value }))} placeholder="输入当前密码" />
                      <button type="button" onClick={() => setShowPwd(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-current transition">
                        {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </Field>
                  <Field label="新密码" icon={Lock}>
                    <input type={showPwd ? 'text' : 'password'} className="input-field" value={pwd.newPassword} onChange={e => setPwd(p => ({ ...p, newPassword: e.target.value }))} placeholder="至少 6 位" />
                  </Field>
                  <Field label="确认新密码" icon={Lock}>
                    <input type={showPwd ? 'text' : 'password'} className="input-field" value={pwd.confirm} onChange={e => setPwd(p => ({ ...p, confirm: e.target.value }))} placeholder="再次输入新密码" />
                  </Field>
                </div>
                <div className="flex justify-end mt-6">
                  <SaveButton loading={savingPwd} onClick={savePassword} label="修改密码" />
                </div>
              </Section>
            )}

            {tab === 'appearance' && (
              <Section title="外观偏好" desc="选择你喜欢的主题，设置会自动保存。">
                <div className="grid grid-cols-2 gap-4 max-w-lg">
                  <ThemeCard active={theme === 'dark'} onClick={() => theme !== 'dark' && toggleTheme()} icon={Moon} label="深色模式" desc="沉浸式深色界面" colors={['#070912', '#0e1320', '#6366f1']} />
                  <ThemeCard active={theme === 'light'} onClick={() => theme !== 'light' && toggleTheme()} icon={Sun} label="浅色模式" desc="清爽明亮的界面" colors={['#f5f6fa', '#ffffff', '#6366f1']} />
                </div>
                <div className="mt-6 p-4 rounded-xl bg-surface-2 flex items-start gap-3">
                  <Check size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-muted">主题偏好会保存在你的浏览器中，下次访问时自动应用。</p>
                </div>
              </Section>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function Section({ title, desc, children }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-5 sm:p-6">
      <div className="mb-5">
        <h2 className="font-display font-bold text-lg">{title}</h2>
        {desc && <p className="text-muted text-sm mt-0.5">{desc}</p>}
      </div>
      {children}
    </motion.div>
  );
}

function Field({ label, icon: Icon, full, children }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <label className="flex items-center gap-1.5 text-sm font-medium mb-1.5">
        <Icon size={14} className="text-muted" /> {label}
      </label>
      {children}
    </div>
  );
}

function SaveButton({ loading, onClick, label }) {
  return (
    <button onClick={onClick} disabled={loading} className="btn-primary px-6 py-2.5 rounded-xl inline-flex items-center gap-2 text-sm disabled:opacity-60">
      {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
      {loading ? '保存中…' : label}
    </button>
  );
}

function ThemeCard({ active, onClick, icon: Icon, label, desc, colors }) {
  return (
    <button
      onClick={onClick}
      className="relative card surface-hover p-4 text-left overflow-hidden"
      style={active ? { borderColor: '#6366f1', boxShadow: '0 0 0 1px #6366f1' } : {}}
    >
      <div className="flex items-center gap-2 mb-3">
        <Icon size={18} className={active ? 'text-brand-400' : 'text-muted'} />
        <span className="font-medium text-sm">{label}</span>
        {active && <Check size={16} className="text-brand-400 ml-auto" />}
      </div>
      <div className="flex gap-1.5 h-10 rounded-lg overflow-hidden">
        {colors.map((c, i) => <div key={i} className="flex-1" style={{ background: c }} />)}
      </div>
      <p className="text-xs text-muted mt-2">{desc}</p>
    </button>
  );
}
