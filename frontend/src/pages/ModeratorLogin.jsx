import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Scale, Eye, EyeOff, Flag, Pin, CheckCircle2, MessageSquareWarning, ArrowLeft, Gavel } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { api } from '../lib/api.js';

/**
 * 版主端独立登录界面 — 工作台美学（白底版）
 * 白色基底 + 暖琥珀点缀，区别于用户端与指挥中心
 */
export default function ModeratorLogin() {
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
      const res = await api.loginScoped(form, 'moderator');
      login(res.token, res.user);
      toast('版主登录成功', 'success');
      navigate('/dashboard');
    } catch (err) { toast(err.message, 'error'); }
    finally { setLoading(false); }
  };

  const ACCENT = '#d97706';

  // 工作台待办预览（静态示意，强调版主工作场景）
  const tasks = [
    { icon: Flag, label: '待处理举报', count: 7, color: '#dc2626' },
    { icon: MessageSquareWarning, label: '待审核帖子', count: 12, color: ACCENT },
    { icon: Pin, label: '置顶申请', count: 3, color: '#7c3aed' },
    { icon: CheckCircle2, label: '今日已处理', count: 28, color: '#16a34a' },
  ];

  return (
    <div className="min-h-screen relative flex flex-col" style={{ background: '#ffffff', color: '#44403c' }}>
      {/* 暖色光晕氛围 */}
      <div className="fixed inset-0 pointer-events-none" style={{
        background: `
          radial-gradient(ellipse 60% 50% at 50% 0%, ${ACCENT}12, transparent 60%),
          radial-gradient(ellipse 50% 40% at 0% 100%, ${ACCENT}0c, transparent 55%),
          radial-gradient(ellipse 50% 40% at 100% 80%, #b453090c, transparent 55%)
        `,
      }} />
      {/* 细密斜纹纹理 */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.02]" style={{
        background: `repeating-linear-gradient(45deg, ${ACCENT} 0, ${ACCENT} 1px, transparent 1px, transparent 8px)`,
      }} />

      {/* 顶部工作条 */}
      <header className="relative z-10 h-14 flex items-center justify-between px-5 sm:px-8 border-b bg-white/85" style={{ borderColor: `${ACCENT}1f`, backdropFilter: 'blur(8px)' }}>
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${ACCENT}12`, border: `1px solid ${ACCENT}33` }}>
            <Gavel size={16} style={{ color: ACCENT }} />
          </div>
          <div className="leading-none">
            <span className="font-display font-bold text-base text-stone-800">YS 论坛</span>
            <span className="ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: `${ACCENT}12`, color: ACCENT }}>MOD</span>
          </div>
        </Link>
        <Link to="/" className="text-xs text-stone-400 hover:text-stone-600 transition flex items-center gap-1">
          <ArrowLeft size={13} /> 返回主站
        </Link>
      </header>

      {/* 主体：双栏（待办概览 + 登录卡） */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-5 sm:p-8">
        <div className="w-full max-w-4xl grid md:grid-cols-[1fr_1.1fr] gap-6 items-stretch">
          {/* 左：版主职责概览 */}
          <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} className="hidden md:flex flex-col">
            <div className="inline-flex items-center gap-2 self-start mb-4 px-2.5 py-1 rounded-full text-[11px] font-medium" style={{ background: `${ACCENT}12`, color: ACCENT, border: `1px solid ${ACCENT}26` }}>
              <Scale size={12} /> 版主工作台
            </div>
            <h1 className="font-display text-3xl font-extrabold leading-tight mb-3 text-stone-800">
              维护秩序，<br />
              <span style={{
                background: `linear-gradient(135deg, ${ACCENT}, #f59e0b)`,
                WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>凝聚讨论温度</span>
            </h1>
            <p className="text-stone-500 text-sm leading-relaxed mb-7 max-w-xs">
              版主专属通道。处理举报、审核内容、置顶优质主题，让社区讨论有序而充满活力。
            </p>

            {/* 待办预览卡片网格 */}
            <div className="grid grid-cols-2 gap-2.5 mt-auto">
              {tasks.map((t, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 + i * 0.08 }}
                  className="p-3 rounded-xl bg-white" style={{ border: '1px solid #f0ebe5' }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <t.icon size={15} style={{ color: t.color }} />
                    <span className="font-display text-xl font-bold" style={{ color: t.color }}>{t.count}</span>
                  </div>
                  <p className="text-[11px] text-stone-500 leading-tight">{t.label}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* 右：登录卡片 */}
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-7 sm:p-8 flex flex-col bg-white" style={{ border: `1px solid ${ACCENT}26`, boxShadow: '0 12px 40px -16px rgba(217,119,6,0.18)' }}>
            <div className="mb-6">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: `linear-gradient(135deg, ${ACCENT}, #b45309)`, boxShadow: `0 10px 28px -8px ${ACCENT}66` }}>
                <Scale size={24} className="text-white" />
              </div>
              <h2 className="font-display text-2xl font-bold mb-1 text-stone-800">版主登录</h2>
              <p className="text-stone-400 text-sm">仅限版主与管理员账号</p>
            </div>

            <form onSubmit={submit} className="space-y-4 flex-1">
              <div>
                <label className="text-xs font-medium text-stone-500 mb-1.5 block">版主账号</label>
                <input
                  className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition placeholder:text-stone-300 bg-white text-stone-800"
                  style={{ border: '1px solid #e7e5e4' }}
                  value={form.login}
                  onChange={e => setForm({ ...form, login: e.target.value })}
                  placeholder="输入用户名或邮箱"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-medium text-stone-500 mb-1.5 block">密码</label>
                <div className="relative">
                  <input
                    className="w-full rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none transition placeholder:text-stone-300 bg-white text-stone-800"
                    style={{ border: '1px solid #e7e5e4' }}
                    type={show ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    placeholder="输入密码"
                    required
                  />
                  <button type="button" onClick={() => setShow(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition">
                    {show ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40 flex items-center justify-center gap-2 mt-2"
                style={{ background: `linear-gradient(135deg, ${ACCENT}, #b45309)`, boxShadow: `0 8px 22px -6px ${ACCENT}66` }}>
                {loading ? '登录中…' : <><Scale size={15} /> 进入工作台</>}
              </button>
            </form>

            <p className="text-[11px] text-stone-400 text-center mt-5 leading-relaxed">
              普通用户账号无法登录此入口，请前往
              <Link to="/login" className="font-medium hover:underline" style={{ color: ACCENT }}> 用户端</Link>
            </p>
          </motion.div>
        </div>
      </main>

      <footer className="relative z-10 py-4 text-center text-[11px] text-stone-400">
        YS Forum · Moderator Portal · 仅授权人员可访问
      </footer>
    </div>
  );
}
