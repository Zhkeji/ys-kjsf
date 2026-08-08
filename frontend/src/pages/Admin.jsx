import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Users, FileText, MessageSquare, Wifi, Activity, Flag,
  TrendingUp, UserPlus, Award, Search, Ban, CheckCircle2, XCircle,
  Plus, Loader2, ChevronRight, ShieldAlert, LayoutGrid, Tag, Crown,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Avatar from '../components/ui/Avatar.jsx';
import { FullSpinner, EmptyState } from '../components/ui/Loading.jsx';
import {
  formatNumber, formatTime, getRoleColor, getRoleLabel, getTierColor,
} from '../lib/utils.js';

const ROLES = ['member', 'moderator', 'admin'];
const TIERS = ['bronze', 'silver', 'gold', 'platinum'];
const TIER_LABEL = { bronze: '铜牌', silver: '银牌', gold: '金牌', platinum: '白金' };
const TABS = [
  { key: 'users', label: '用户管理', icon: Users },
  { key: 'reports', label: '举报', icon: Flag },
  { key: 'badges', label: '徽章', icon: Award },
];

export default function Admin() {
  const { user } = useAuth();
  const toast = useToast();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('users');

  const isStaff = user && (user.role === 'admin' || user.role === 'moderator');

  useEffect(() => {
    if (!isStaff) { setLoading(false); return; }
    api.getStats()
      .then(s => setStats(s))
      .catch(e => toast(e.message || '加载统计失败', 'error'))
      .finally(() => setLoading(false));
  }, [isStaff]);

  if (loading) {
    return <div className="max-w-6xl mx-auto px-3 sm:px-5 py-6"><FullSpinner /></div>;
  }

  if (!isStaff) {
    return (
      <div className="max-w-6xl mx-auto px-3 sm:px-5 py-6">
        <EmptyState
          icon={ShieldAlert}
          title="无访问权限"
          desc="此页面仅限管理员与版主访问。如果你认为这是误判，请联系管理员。"
          action={
            <Link to="/" className="btn-primary px-5 py-2.5 rounded-xl inline-flex items-center gap-2">
              返回首页 <ChevronRight size={16} />
            </Link>
          }
        />
      </div>
    );
  }

  const statCards = [
    { label: '总用户', value: stats?.users ?? 0, icon: Users, color: '#6366f1' },
    { label: '总主题', value: stats?.threads ?? 0, icon: FileText, color: '#8b5cf6' },
    { label: '总回复', value: stats?.posts ?? 0, icon: MessageSquare, color: '#06b6d4' },
    { label: '在线用户', value: stats?.online ?? 0, icon: Wifi, color: '#10b981' },
    { label: '今日主题', value: stats?.todayThreads ?? 0, icon: TrendingUp, color: '#ec4899' },
    { label: '今日回复', value: stats?.todayPosts ?? 0, icon: Activity, color: '#f59e0b' },
    { label: '待处理举报', value: stats?.openReports ?? 0, icon: Flag, color: '#ef4444' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="max-w-6xl mx-auto px-3 sm:px-5 py-6">
        {/* Header */}
        <div className="relative overflow-hidden card p-6 sm:p-8 mb-6">
          <div className="absolute inset-0 bg-grid-pattern opacity-20" style={{ backgroundSize: '32px 32px' }} />
          <div className="absolute -top-20 -right-10 w-72 h-72 rounded-full blur-3xl opacity-25" style={{ background: 'radial-gradient(circle, #ef4444, transparent)' }} />
          <div className="relative flex items-center gap-4">
            <div className="p-3 rounded-2xl shrink-0" style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.25), rgba(245,158,11,0.16))', border: '1px solid rgba(239,68,68,0.3)' }}>
              <Shield size={26} className="text-red-400" />
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold">
                管理<span className="gradient-text">控制台</span>
              </h1>
              <p className="text-muted text-sm mt-1">社区数据概览与内容管理。</p>
            </div>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {statCards.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="card p-4 relative overflow-hidden"
            >
              <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full blur-2xl opacity-20" style={{ background: s.color }} />
              <div className="relative flex items-center justify-between mb-2">
                <div className="p-1.5 rounded-lg" style={{ background: `${s.color}1a` }}>
                  <s.icon size={16} style={{ color: s.color }} />
                </div>
              </div>
              <p className="font-display text-2xl sm:text-3xl font-extrabold relative">{formatNumber(s.value)}</p>
              <p className="text-xs text-muted relative">{s.label}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          {/* Activity chart */}
          <div className="lg:col-span-2 card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Activity size={16} className="text-brand-400" />
              <h2 className="font-display font-bold">活跃趋势</h2>
              <span className="text-xs text-muted">· 近期每日主题</span>
            </div>
            <ActivityChart data={stats?.activity || []} />
          </div>

          {/* Top categories */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Tag size={16} className="text-violetx-400" />
              <h2 className="font-display font-bold">热门分类</h2>
            </div>
            <TopCategories data={stats?.topCategories || []} />
          </div>
        </div>

        {/* Recent users */}
        <div className="card p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <UserPlus size={16} className="text-cyanx-400" />
              <h2 className="font-display font-bold">新注册用户</h2>
            </div>
          </div>
          <RecentUsers users={stats?.recentUsers || []} />
        </div>

        {/* Management tabs */}
        <div className="flex items-center gap-1 glass rounded-xl p-1 mb-4 w-fit">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition ${tab === t.key ? 'btn-primary' : 'hover:bg-surface-2 text-muted'}`}
            >
              <t.icon size={15} /> {t.label}
            </button>
          ))}
        </div>

        {tab === 'users' && <UsersManager />}
        {tab === 'reports' && <ReportsManager />}
        {tab === 'badges' && <BadgesManager />}
      </div>
    </motion.div>
  );
}

function ActivityChart({ data }) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-muted py-8 text-center">暂无活动数据</p>;
  }
  const max = Math.max(1, ...data.map(d => d.threads || 0));
  return (
    <div className="flex items-end gap-2 h-40">
      {data.map((d, i) => {
        const h = Math.max(4, ((d.threads || 0) / max) * 100);
        const date = d.date ? new Date(d.date) : null;
        const label = date ? `${date.getMonth() + 1}/${date.getDate()}` : `#${i + 1}`;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group min-w-0">
            <span className="text-[10px] font-semibold text-muted opacity-0 group-hover:opacity-100 transition">{d.threads || 0}</span>
            <div className="w-full rounded-t-md relative overflow-hidden transition-all hover:opacity-90" style={{ height: `${h}%`, background: 'linear-gradient(180deg, #6366f1, #8b5cf6)' }}>
              <div className="absolute inset-0 bg-grid-pattern opacity-30" style={{ backgroundSize: '8px 8px' }} />
            </div>
            <span className="text-[10px] text-muted truncate w-full text-center">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

function TopCategories({ data }) {
  if (data.length === 0) return <p className="text-sm text-muted py-4">暂无分类数据</p>;
  const max = Math.max(1, ...data.map(c => c.count || c.threadCount || 0));
  return (
    <div className="space-y-3">
      {data.map((c, i) => {
        const count = c.count || c.threadCount || 0;
        const color = c.color || '#6366f1';
        return (
          <div key={c.id || i}>
            <div className="flex items-center justify-between mb-1">
              <Link to={`/category/${c.slug}`} className="text-sm font-medium hover:text-brand-400 transition truncate flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                {c.name}
              </Link>
              <span className="text-xs text-muted shrink-0 ml-2">{formatNumber(count)}</span>
            </div>
            <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${(count / max) * 100}%`, background: color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RecentUsers({ users }) {
  if (users.length === 0) return <p className="text-sm text-muted py-4">暂无新用户</p>;
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {users.map(u => {
        const roleColor = getRoleColor(u.role);
        return (
          <Link key={u.id} to={`/u/${u.username}`} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-2 transition group">
            <Avatar user={u} size={40} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate group-hover:text-brand-400 transition">{u.displayName || u.username}</p>
              <p className="text-xs text-muted">{formatTime(u.createdAt)}</p>
            </div>
            <span className="chip text-xs shrink-0" style={{ background: `${roleColor}1a`, color: roleColor, borderColor: `${roleColor}40` }}>
              {getRoleLabel(u.role)}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

/* ----------------------------- Users Manager ----------------------------- */
function UsersManager() {
  const toast = useToast();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [pending, setPending] = useState({});

  const load = useCallback((query = '') => {
    setLoading(true);
    api.getAdminUsers(query ? `?q=${encodeURIComponent(query)}` : '')
      .then(r => setUsers(r.items || r || []))
      .catch(e => toast(e.message || '加载用户失败', 'error'))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const onSearch = (e) => {
    e.preventDefault();
    load(q);
  };

  const patch = async (u, body) => {
    setPending(p => ({ ...p, [u.id]: true }));
    const prev = users;
    setUsers(list => list.map(x => x.id === u.id ? { ...x, ...body } : x));
    try {
      await api.patchUser(u.id, body);
      toast('已更新', 'success');
    } catch (e) {
      setUsers(prev);
      toast(e.message || '操作失败', 'error');
    } finally {
      setPending(p => ({ ...p, [u.id]: false }));
    }
  };

  return (
    <div className="card overflow-hidden">
      <form onSubmit={onSearch} className="flex items-center gap-2 px-5 py-4 border-b border-default">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input className="input-field pl-9" value={q} onChange={e => setQ(e.target.value)} placeholder="搜索用户名或昵称…" />
        </div>
        <button type="submit" className="btn-primary px-4 py-2.5 rounded-xl text-sm">搜索</button>
      </form>

      {loading ? <FullSpinner /> : users.length === 0 ? (
        <EmptyState icon={Users} title="没有匹配的用户" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted border-b border-default">
                <th className="px-5 py-3 font-medium">用户</th>
                <th className="px-5 py-3 font-medium hidden sm:table-cell">声望</th>
                <th className="px-5 py-3 font-medium">角色</th>
                <th className="px-5 py-3 font-medium">状态</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const roleColor = getRoleColor(u.role);
                const isSelf = currentUser && u.id === currentUser.id;
                return (
                  <tr key={u.id} className="border-b border-default last:border-0 hover:bg-surface-2/50 transition">
                    <td className="px-5 py-3">
                      <Link to={`/u/${u.username}`} className="flex items-center gap-3 group">
                        <Avatar user={u} size={36} />
                        <div className="min-w-0">
                          <p className="font-medium truncate group-hover:text-brand-400 transition">{u.displayName || u.username}</p>
                          <p className="text-xs text-muted truncate">@{u.username}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-5 py-3 hidden sm:table-cell text-muted">{formatNumber(u.reputation)}</td>
                    <td className="px-5 py-3">
                      <select
                        value={u.role}
                        disabled={isSelf || pending[u.id]}
                        onChange={e => patch(u, { role: e.target.value })}
                        className="input-field py-1.5 text-xs w-28 disabled:opacity-50"
                        style={{ color: roleColor }}
                      >
                        {ROLES.map(r => <option key={r} value={r}>{getRoleLabel(r)}</option>)}
                      </select>
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => patch(u, { banned: !u.banned })}
                        disabled={isSelf || pending[u.id]}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition disabled:opacity-40 ${
                          u.banned ? 'bg-red-500/15 text-red-400' : 'bg-emerald-500/15 text-emerald-400'
                        }`}
                      >
                        {u.banned ? <><Ban size={13} /> 已封禁</> : <><CheckCircle2 size={13} /> 正常</>}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ---------------------------- Reports Manager ---------------------------- */
const REPORT_STATUS = {
  open: { label: '待处理', color: '#f59e0b', icon: Flag },
  resolved: { label: '已处理', color: '#10b981', icon: CheckCircle2 },
  dismissed: { label: '已驳回', color: '#9aa3bd', icon: XCircle },
};

function ReportsManager() {
  const toast = useToast();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState({});

  const load = () => {
    setLoading(true);
    api.getReports()
      .then(r => setReports(r.items || r || []))
      .catch(e => toast(e.message || '加载举报失败', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const patch = async (r, body) => {
    setPending(p => ({ ...p, [r.id]: true }));
    const prev = reports;
    setReports(list => list.map(x => x.id === r.id ? { ...x, ...body } : x));
    try {
      await api.patchReport(r.id, body);
      toast('已更新举报状态', 'success');
    } catch (e) {
      setReports(prev);
      toast(e.message || '操作失败', 'error');
    } finally {
      setPending(p => ({ ...p, [r.id]: false }));
    }
  };

  if (loading) return <div className="card"><FullSpinner /></div>;
  if (reports.length === 0) return <div className="card"><EmptyState icon={Flag} title="没有举报记录" desc="目前没有待处理的举报，社区很和谐。" /></div>;

  return (
    <div className="space-y-3">
      {reports.map(r => {
        const st = REPORT_STATUS[r.status] || REPORT_STATUS.open;
        const StatusIcon = st.icon;
        const reporter = r.reporter || r.author;
        const target = r.targetUser || r.target;
        return (
          <motion.div key={r.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg shrink-0" style={{ background: `${st.color}1a`, color: st.color }}>
                <StatusIcon size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{r.reason || r.title || '举报'}</span>
                  <span className="chip text-xs" style={{ background: `${st.color}1a`, color: st.color, borderColor: `${st.color}40` }}>
                    {st.label}
                  </span>
                </div>
                {r.description && <p className="text-sm text-muted mt-1 line-clamp-2">{r.description}</p>}
                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted">
                  {reporter && (
                    <Link to={`/u/${reporter.username}`} className="flex items-center gap-1 hover:text-brand-400 transition">
                      <Avatar user={reporter} size={16} /> 举报人 {reporter.displayName || reporter.username}
                    </Link>
                  )}
                  {target && (
                    <Link to={`/u/${target.username}`} className="flex items-center gap-1 hover:text-brand-400 transition">
                      <Avatar user={target} size={16} /> 被举报 {target.displayName || target.username}
                    </Link>
                  )}
                  <span>{formatTime(r.createdAt)}</span>
                </div>
              </div>
              {r.status === 'open' && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => patch(r, { status: 'resolved' })} disabled={pending[r.id]} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition disabled:opacity-50 inline-flex items-center gap-1">
                    {pending[r.id] ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} 处理
                  </button>
                  <button onClick={() => patch(r, { status: 'dismissed' })} disabled={pending[r.id]} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface-2 text-muted hover:bg-surface-2/80 transition disabled:opacity-50 inline-flex items-center gap-1">
                    <XCircle size={13} /> 驳回
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ---------------------------- Badges Manager ---------------------------- */
const EMPTY_BADGE = { name: '', description: '', icon: '', tier: 'bronze' };

function BadgesManager() {
  const toast = useToast();
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_BADGE);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [award, setAward] = useState({}); // badgeId -> { userId, open }
  const [awarding, setAwarding] = useState({});

  const load = () => {
    setLoading(true);
    api.getBadges()
      .then(r => setBadges(r.items || r || []))
      .catch(e => toast(e.message || '加载徽章失败', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.name.trim()) { toast('请填写徽章名称', 'error'); return; }
    setSaving(true);
    try {
      await api.createBadge({
        name: form.name.trim(),
        description: form.description,
        icon: form.icon || '🏆',
        tier: form.tier,
      });
      toast('徽章创建成功', 'success');
      setForm(EMPTY_BADGE);
      setShowForm(false);
      load();
    } catch (e) {
      toast(e.message || '创建失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  const doAward = async (badgeId) => {
    const userId = (award[badgeId]?.userId || '').trim();
    if (!userId) { toast('请输入用户 ID', 'error'); return; }
    setAwarding(a => ({ ...a, [badgeId]: true }));
    try {
      await api.awardBadge(badgeId, userId);
      toast('徽章已颁发', 'success');
      setAward(a => ({ ...a, [badgeId]: { userId: '', open: false } }));
      load();
    } catch (e) {
      toast(e.message || '颁发失败', 'error');
    } finally {
      setAwarding(a => ({ ...a, [badgeId]: false }));
    }
  };

  if (loading) return <div className="card"><FullSpinner /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">共 {badges.length} 个徽章</p>
        <button onClick={() => setShowForm(s => !s)} className="btn-primary px-4 py-2 rounded-xl inline-flex items-center gap-2 text-sm">
          <Plus size={16} /> {showForm ? '收起' : '创建徽章'}
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="card p-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">徽章名称</label>
                  <input className="input-field" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="如：优质贡献者" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">图标（emoji 或字符）</label>
                  <input className="input-field" value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} placeholder="🏆" maxLength={2} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">等级</label>
                  <select className="input-field" value={form.tier} onChange={e => setForm(f => ({ ...f, tier: e.target.value }))}>
                    {TIERS.map(t => <option key={t} value={t}>{TIER_LABEL[t]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">描述</label>
                  <input className="input-field" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="获得条件说明" />
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <button onClick={create} disabled={saving} className="btn-primary px-5 py-2.5 rounded-xl inline-flex items-center gap-2 text-sm disabled:opacity-60">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} 创建
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {badges.length === 0 ? (
        <div className="card"><EmptyState icon={Award} title="还没有徽章" desc="创建第一个徽章来奖励社区成员。" /></div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {badges.map(b => {
            const tier = getTierColor(b.tier);
            const aState = award[b.id] || { userId: '', open: false };
            return (
              <div key={b.id} className="card p-4 relative overflow-hidden">
                <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-20" style={{ background: tier }} />
                <div className="relative flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-2xl" style={{ background: `${tier}26`, color: tier }}>
                    {b.icon && [...b.icon].length <= 2 ? b.icon : '🏆'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold truncate">{b.name}</p>
                      <span className="chip text-xs" style={{ background: `${tier}1a`, color: tier, borderColor: `${tier}40` }}>{TIER_LABEL[b.tier] || '徽章'}</span>
                    </div>
                    {b.description && <p className="text-xs text-muted mt-1 line-clamp-2">{b.description}</p>}
                  </div>
                </div>
                <div className="relative mt-3">
                  {aState.open ? (
                    <div className="flex items-center gap-2">
                      <input
                        className="input-field py-2 text-sm"
                        placeholder="输入用户 ID 颁发徽章"
                        value={aState.userId}
                        onChange={e => setAward(a => ({ ...a, [b.id]: { ...aState, userId: e.target.value } }))}
                      />
                      <button onClick={() => doAward(b.id)} disabled={awarding[b.id]} className="btn-primary px-3 py-2 rounded-lg text-sm shrink-0 inline-flex items-center gap-1 disabled:opacity-60">
                        {awarding[b.id] ? <Loader2 size={14} className="animate-spin" /> : <Crown size={14} />} 颁发
                      </button>
                      <button onClick={() => setAward(a => ({ ...a, [b.id]: { userId: '', open: false } }))} className="px-3 py-2 rounded-lg text-sm border hover:bg-surface-2 text-muted transition shrink-0">取消</button>
                    </div>
                  ) : (
                    <button onClick={() => setAward(a => ({ ...a, [b.id]: { userId: '', open: true } }))} className="text-sm text-brand-400 hover:underline inline-flex items-center gap-1">
                      <Crown size={14} /> 颁发给用户
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
