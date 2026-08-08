import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Eye, EyeOff, Lock, Fingerprint, Activity, Server, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { api } from '../lib/api.js';

/**
 * 管理端独立登录界面 — 指挥中心美学（白底版）
 * 白色基底 + 深红警示，与用户端/版主端完全区隔
 */
export default function AdminLogin() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ login: '', password: '' });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clock, setClock] = useState('');
  const authSteps = ['CREDENTIAL', 'ROLE', 'SESSION'];

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      setClock(`${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.loginScoped(form, 'admin');
      login(res.token, res.user);
      toast('管理员授权成功', 'success');
      navigate('/admin');
    } catch (err) { toast(err.message, 'error'); }
    finally { setLoading(false); }
  };

  const ACCENT = '#dc2626';

  return (
    <div className="min-h-screen relative flex overflow-hidden" style={{ background: '#ffffff', color: '#1e293b' }}>
      {/* 红光氛围 */}
      <div className="fixed inset-0 pointer-events-none" style={{
        background: `
          radial-gradient(ellipse 50% 40% at 20% 0%, ${ACCENT}14, transparent 60%),
          radial-gradient(ellipse 40% 50% at 100% 100%, ${ACCENT}10, transparent 55%)
        `,
      }} />
      {/* 扫描线效果 */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]" style={{
        background: `repeating-linear-gradient(0deg, ${ACCENT} 0, ${ACCENT} 1px, transparent 1px, transparent 3px)`,
      }} />

      {/* 顶部状态栏 */}
      <div className="fixed top-0 left-0 right-0 h-10 flex items-center justify-between px-5 text-[11px] font-mono border-b z-20"
        style={{ borderColor: `${ACCENT}22`, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)' }}>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5" style={{ color: ACCENT }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: ACCENT }} /> SECURE-CHANNEL
          </span>
          <span className="text-slate-400">SYS://YS-FORUM/ADMIN</span>
        </div>
        <div className="flex items-center gap-4 text-slate-400">
          <span className="hidden sm:inline">AUTH-LVL: SUPERUSER</span>
          <span>{clock}</span>
        </div>
      </div>

      {/* 左侧：系统监控面板 */}
      <div className="hidden lg:flex flex-col w-[42%] p-12 pt-20 border-r relative z-10" style={{ borderColor: '#e5e7eb' }}>
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${ACCENT}12`, border: `1px solid ${ACCENT}33` }}>
              <Shield size={24} style={{ color: ACCENT }} />
            </div>
            <div>
              <p className="text-[10px] font-mono tracking-widest" style={{ color: ACCENT }}>RESTRICTED AREA</p>
              <p className="font-display font-bold text-xl text-slate-800">系统控制中心</p>
            </div>
          </div>
        </motion.div>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="text-slate-500 text-sm leading-relaxed mb-10 max-w-sm">
          超级管理员通道。所有操作将被审计记录，未经授权的访问尝试将触发安全告警。
        </motion.p>

        {/* 模拟监控数据 */}
        <div className="space-y-3 mb-8">
          {[
            { icon: Server, label: '系统状态', value: 'OPERATIONAL', color: '#16a34a' },
            { icon: Activity, label: '实时会话', value: '1,284 active', color: ACCENT },
            { icon: AlertTriangle, label: '待审事件', value: '3 pending', color: '#d97706' },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.1 }}
              className="flex items-center gap-3 p-3 rounded-lg bg-white" style={{ border: '1px solid #e5e7eb' }}>
              <s.icon size={16} style={{ color: s.color }} />
              <span className="text-xs text-slate-500 flex-1 font-mono">{s.label}</span>
              <span className="text-xs font-mono font-semibold" style={{ color: s.color }}>{s.value}</span>
            </motion.div>
          ))}
        </div>

        {/* 权限提示 */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
          className="mt-auto p-4 rounded-lg border-l-2" style={{ borderColor: ACCENT, background: `${ACCENT}08` }}>
          <p className="text-[11px] font-mono text-slate-500 leading-relaxed">
            <span style={{ color: ACCENT }}>// 权限要求</span><br />
            仅 role=admin 账号可经此通道登录。普通用户与版主账号将被系统拒绝。
          </p>
        </motion.div>
      </div>

      {/* 右侧：登录控制台 */}
      <div className="flex-1 flex items-center justify-center p-6 pt-20 relative z-10">
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 0.96 }}
          className="w-full max-w-md">
          <div className="mb-8">
            <p className="text-[11px] font-mono tracking-[0.2em] mb-2" style={{ color: ACCENT }}>&gt; INITIALIZE ADMIN SESSION</p>
            <h1 className="font-display text-3xl font-bold mb-1 text-slate-800">管理员授权</h1>
            <p className="text-slate-400 text-sm">输入超级管理员凭据以建立加密会话</p>
          </div>

          {/* 认证流程指示 */}
          <div className="flex items-center gap-2 mb-7 text-[10px] font-mono">
            {authSteps.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <span className="px-2 py-1 rounded" style={{ background: i === 0 ? `${ACCENT}12` : '#f8fafc', color: i === 0 ? ACCENT : '#94a3b8', border: `1px solid ${i === 0 ? ACCENT + '33' : '#e5e7eb'}` }}>
                  {i === 0 ? '●' : '○'} {s}
                </span>
                {i < authSteps.length - 1 && <span className="text-slate-300">→</span>}
              </div>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="text-[11px] font-mono tracking-wider text-slate-500 mb-2 block flex items-center gap-1.5">
                <Fingerprint size={12} /> ADMIN_ID
              </label>
              <input
                className="w-full bg-white border rounded-lg px-4 py-3 text-sm font-mono focus:outline-none transition placeholder:text-slate-300 text-slate-800"
                style={{ borderColor: '#e5e7eb' }}
                value={form.login}
                onChange={e => setForm({ ...form, login: e.target.value })}
                placeholder="enter admin username or email"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="text-[11px] font-mono tracking-wider text-slate-500 mb-2 block flex items-center gap-1.5">
                <Lock size={12} /> PASSPHRASE
              </label>
              <div className="relative">
                <input
                  className="w-full bg-white border rounded-lg px-4 py-3 pr-11 text-sm font-mono focus:outline-none transition placeholder:text-slate-300 text-slate-800"
                  style={{ borderColor: '#e5e7eb' }}
                  type={show ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••••••"
                  required
                />
                <button type="button" onClick={() => setShow(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition">
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3.5 rounded-lg font-mono font-semibold text-sm tracking-wider transition-all disabled:opacity-40 flex items-center justify-center gap-2 text-white"
              style={{ background: `linear-gradient(135deg, ${ACCENT}, #b91c1c)`, boxShadow: `0 8px 24px -6px ${ACCENT}66` }}>
              {loading ? (
                <><span className="animate-pulse">AUTHENTICATING</span><span className="animate-ping">_</span></>
              ) : (
                <><Shield size={15} /> AUTHORIZE &amp; ENTER</>
              )}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between text-[11px] font-mono">
            <Link to="/" className="text-slate-400 hover:text-slate-600 transition flex items-center gap-1">
              <ArrowLeft size={12} /> exit to site
            </Link>
            <span className="text-slate-300">encrypted · audited</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
