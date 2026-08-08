import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Check, Users, Sparkles, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { api } from '../lib/api.js';

export default function Register() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '', displayName: '' });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.register(form);
      login(res.token, res.user);
      toast('注册成功，欢迎加入 YS 论坛！', 'success');
      navigate('/');
    } catch (err) { toast(err.message, 'error'); }
    finally { setLoading(false); }
  };

  return (
    <div className="light-scope min-h-[calc(100vh-4rem)] flex items-center justify-center p-4" style={{ background: '#ffffff' }}>
      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-8 items-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-7 sm:p-8 order-2 lg:order-1" style={{ border: '1px solid #e5e7eb', boxShadow: '0 12px 40px -16px rgba(99,102,241,0.18)' }}>
          <h2 className="font-display text-2xl font-bold mb-1 text-slate-800">创建账号</h2>
          <p className="text-slate-400 text-sm mb-6">加入 YS 论坛，开启你的社区之旅</p>

          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block text-slate-600">用户名 <span className="text-red-500">*</span></label>
                <input className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none transition placeholder:text-slate-300 bg-white text-slate-800" style={{ border: '1px solid #e5e7eb' }}
                  value={form.username} onChange={e => setForm({ ...form, username: e.target.value })}
                  placeholder="2-20个字符" required minLength={2} maxLength={20} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block text-slate-600">昵称</label>
                <input className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none transition placeholder:text-slate-300 bg-white text-slate-800" style={{ border: '1px solid #e5e7eb' }}
                  value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })}
                  placeholder="展示名称" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block text-slate-600">邮箱 <span className="text-red-500">*</span></label>
              <input type="email" className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none transition placeholder:text-slate-300 bg-white text-slate-800" style={{ border: '1px solid #e5e7eb' }}
                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com" required />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block text-slate-600">密码 <span className="text-red-500">*</span></label>
              <div className="relative">
                <input className="w-full rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none transition placeholder:text-slate-300 bg-white text-slate-800" style={{ border: '1px solid #e5e7eb' }}
                  type={show ? 'text' : 'password'} value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })} placeholder="至少6个字符" required minLength={6} />
                <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3 rounded-xl text-base disabled:opacity-50">
              {loading ? '注册中…' : '注册账号'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            已有账号？<Link to="/login" className="text-brand-400 font-medium hover:underline">立即登录</Link>
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="hidden lg:block order-1 lg:order-2">
          <div className="inline-flex items-center gap-2 mb-6 px-2.5 py-1 rounded-full text-[11px] font-medium" style={{ background: 'rgba(139,92,246,0.10)', border: '1px solid rgba(139,92,246,0.22)', color: '#8b5cf6' }}>
            <Sparkles size={13} /> 加入 1000+ 社区成员
          </div>
          <h1 className="font-display text-4xl font-extrabold leading-tight mb-4 text-slate-800">
            成为社区的一分子，<br /><span className="gradient-text">让声音被听见</span>
          </h1>
          <p className="text-slate-500 text-lg mb-8">注册即可享受全部功能：发帖讨论、实时聊天、私信交流、活动参与。</p>
          <div className="space-y-3">
            {[
              { icon: Check, text: '免费注册，永久使用', color: '#16a34a' },
              { icon: Users, text: '结识志同道合的朋友', color: '#6366f1' },
              { icon: Shield, text: '安全可信的社区环境', color: '#d97706' },
            ].map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.1 }}
                className="flex items-center gap-3 text-slate-700">
                <div className="p-2 rounded-lg" style={{ background: `${f.color}14` }}><f.icon size={18} style={{ color: f.color }} /></div>
                <span>{f.text}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
