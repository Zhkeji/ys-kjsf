import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Sparkles, MessageCircle, Zap, Trophy } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { api } from '../lib/api.js';

export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ login: '', password: '' });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.login(form);
      login(res.token, res.user);
      toast('登录成功，欢迎回来！', 'success');
      navigate('/');
    } catch (err) { toast(err.message, 'error'); }
    finally { setLoading(false); }
  };

  return (
    <div className="light-scope min-h-[calc(100vh-4rem)] flex items-center justify-center p-4" style={{ background: '#ffffff' }}>
      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Left: Branding */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="hidden lg:block">
          <div className="inline-flex items-center gap-2 mb-6 px-2.5 py-1 rounded-full text-[11px] font-medium" style={{ background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.22)', color: '#6366f1' }}>
            <Sparkles size={13} /> 欢迎回到 YS 论坛
          </div>
          <h1 className="font-display text-4xl font-extrabold leading-tight mb-4 text-slate-800">
            重新登录，<br /><span className="gradient-text">继续你的旅程</span>
          </h1>
          <p className="text-slate-500 text-lg mb-8">你的每一次发言、每一次互动，都在让这个社区变得更好。</p>
          <div className="space-y-3">
            {[
              { icon: MessageCircle, text: '实时聊天与深度讨论并存', color: '#6366f1' },
              { icon: Zap, text: '丰富的反应系统，表达更精准', color: '#d97706' },
              { icon: Trophy, text: '声望与徽章，记录你的贡献', color: '#16a34a' },
            ].map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.1 }}
                className="flex items-center gap-3 text-slate-700">
                <div className="p-2 rounded-lg" style={{ background: `${f.color}14` }}><f.icon size={18} style={{ color: f.color }} /></div>
                <span>{f.text}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Right: Form */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-7 sm:p-8" style={{ border: '1px solid #e5e7eb', boxShadow: '0 12px 40px -16px rgba(99,102,241,0.18)' }}>
          <h2 className="font-display text-2xl font-bold mb-1 text-slate-800">用户登录</h2>
          <p className="text-slate-400 text-sm mb-6">输入你的账号信息以继续</p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block text-slate-600">用户名或邮箱</label>
              <input className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none transition placeholder:text-slate-300 bg-white text-slate-800" style={{ border: '1px solid #e5e7eb' }}
                value={form.login} onChange={e => setForm({ ...form, login: e.target.value })}
                placeholder="输入用户名或邮箱" required />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block text-slate-600">密码</label>
              <div className="relative">
                <input className="w-full rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none transition placeholder:text-slate-300 bg-white text-slate-800" style={{ border: '1px solid #e5e7eb' }}
                  type={show ? 'text' : 'password'} value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })} placeholder="输入密码" required />
                <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3 rounded-xl text-base disabled:opacity-50">
              {loading ? '登录中…' : '登录'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            还没有账号？<Link to="/register" className="text-brand-400 font-medium hover:underline">立即注册</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
