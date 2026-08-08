import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays, MapPin, Clock, Users, Plus, X, CalendarPlus,
  Check, Star, Trash2, Loader2, CalendarX,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Avatar from '../components/ui/Avatar.jsx';
import { FullSpinner, EmptyState } from '../components/ui/Loading.jsx';
import { formatTimeFull, formatNumber } from '../lib/utils.js';

const EVENT_COLORS = [
  '#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#ef4444', '#14b8a6',
];

function tsToInput(ts) {
  if (!ts) return '';
  const d = new Date(ts * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function inputToTs(v) {
  if (!v) return null;
  return Math.floor(new Date(v).getTime() / 1000);
}

const EMPTY_FORM = { title: '', description: '', location: '', startTime: '', color: EVENT_COLORS[0] };

export default function Events() {
  const { user } = useAuth();
  const toast = useToast();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = () => {
    setLoading(true);
    api.getEvents()
      .then(r => setEvents(r.items || []))
      .catch(e => toast(e.message || '加载活动失败', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const createEvent = async () => {
    if (!form.title.trim()) { toast('请填写活动标题', 'error'); return; }
    if (!form.startTime) { toast('请选择开始时间', 'error'); return; }
    setSaving(true);
    try {
      await api.createEvent({
        title: form.title.trim(),
        description: form.description,
        location: form.location,
        startTime: inputToTs(form.startTime),
        color: form.color,
      });
      toast('活动创建成功', 'success');
      setForm(EMPTY_FORM);
      setShowForm(false);
      load();
    } catch (e) {
      toast(e.message || '创建失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  const attend = async (ev, status) => {
    if (!user) { toast('请先登录后再报名', 'info'); return; }
    setBusyId(ev.id);
    const prev = events;
    setEvents(list => list.map(e => e.id === ev.id ? {
      ...e,
      isAttending: status,
      attendeeCount: (e.attendeeCount || 0) + (e.isAttending === status ? 0 : (e.isAttending ? 0 : 1)),
    } : e));
    try {
      await api.attendEvent(ev.id, status);
      toast(status === 'attending' ? '已报名参加' : '已标记感兴趣', 'success');
      load();
    } catch (e) {
      setEvents(prev);
      toast(e.message || '操作失败', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const cancelAttend = async (ev) => {
    setBusyId(ev.id);
    const prev = events;
    setEvents(list => list.map(e => e.id === ev.id ? {
      ...e,
      isAttending: null,
      attendeeCount: Math.max(0, (e.attendeeCount || 1) - 1),
    } : e));
    try {
      await api.unattendEvent(ev.id);
      toast('已取消报名', 'info');
      load();
    } catch (e) {
      setEvents(prev);
      toast(e.message || '操作失败', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (ev) => {
    if (!confirm(`确定要删除活动「${ev.title}」吗？`)) return;
    setBusyId(ev.id);
    try {
      await api.deleteEvent(ev.id);
      toast('活动已删除', 'success');
      setEvents(list => list.filter(e => e.id !== ev.id));
    } catch (e) {
      toast(e.message || '删除失败', 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="max-w-5xl mx-auto px-3 sm:px-5 py-6">
        {/* Header */}
        <div className="relative overflow-hidden card p-6 sm:p-8 mb-6">
          <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full blur-3xl opacity-25" style={{ background: 'radial-gradient(circle, #06b6d4, transparent)' }} />
          <div className="absolute inset-0 bg-grid-pattern opacity-20" style={{ backgroundSize: '32px 32px' }} />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl shrink-0 animate-float" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.25), rgba(99,102,241,0.16))', border: '1px solid rgba(6,182,212,0.3)' }}>
                <CalendarDays size={26} className="text-cyanx-400" />
              </div>
              <div className="min-w-0">
                <h1 className="font-display text-2xl sm:text-3xl font-extrabold">
                  社区<span className="gradient-text">活动</span>
                </h1>
                <p className="text-muted text-sm mt-1">发现即将举行的线下/线上活动，报名参与其中。</p>
              </div>
            </div>
            {user && (
              <button onClick={() => setShowForm(true)} className="btn-primary px-5 py-2.5 rounded-xl inline-flex items-center gap-2 text-sm shrink-0">
                <Plus size={18} /> 创建活动
              </button>
            )}
          </div>
        </div>

        {/* List */}
        {loading ? (
          <FullSpinner />
        ) : events.length === 0 ? (
          <EmptyState
            icon={CalendarX}
            title="还没有活动"
            desc="社区活动会展示在这里。有想法的话，创建一个吧！"
            action={user ? (
              <button onClick={() => setShowForm(true)} className="btn-primary px-5 py-2.5 rounded-xl inline-flex items-center gap-2">
                <CalendarPlus size={18} /> 创建第一个活动
              </button>
            ) : null}
          />
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {events.map((ev, i) => (
              <EventCard
                key={ev.id}
                ev={ev}
                index={i}
                user={user}
                busy={busyId === ev.id}
                onAttend={attend}
                onCancel={cancelAttend}
                onDelete={remove}
              />
            ))}
          </div>
        )}

        {/* Create form modal */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
              onClick={() => !saving && setShowForm(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 16 }}
                onClick={e => e.stopPropagation()}
                className="glass-strong rounded-2xl w-full max-w-lg border shadow-2xl"
                style={{ borderColor: 'var(--border)' }}
              >
                <div className="flex items-center justify-between px-5 py-4 border-b border-default">
                  <div className="flex items-center gap-2">
                    <CalendarPlus size={18} className="text-brand-400" />
                    <h3 className="font-display font-bold">创建活动</h3>
                  </div>
                  <button onClick={() => !saving && setShowForm(false)} className="p-1.5 rounded-lg hover:bg-surface-2 text-muted transition">
                    <X size={18} />
                  </button>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">活动标题</label>
                    <input className="input-field" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="给活动起个名字" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">活动描述</label>
                    <textarea className="input-field min-h-[80px] resize-y" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="活动内容、议程等" />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">地点</label>
                      <input className="input-field" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="线上 / 地址" />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">开始时间</label>
                      <input type="datetime-local" className="input-field" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">主题色</label>
                    <div className="flex flex-wrap gap-2">
                      {EVENT_COLORS.map(c => (
                        <button
                          key={c}
                          onClick={() => setForm(f => ({ ...f, color: c }))}
                          className="w-8 h-8 rounded-lg transition hover:scale-110"
                          style={{ background: c, boxShadow: form.color === c ? `0 0 0 2px var(--surface), 0 0 0 4px ${c}` : 'none' }}
                        >
                          {form.color === c && <Check size={16} className="text-white mx-auto" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 px-5 py-4 border-t border-default">
                  <button onClick={() => !saving && setShowForm(false)} className="px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-surface-2 transition">取消</button>
                  <button onClick={createEvent} disabled={saving} className="btn-primary px-5 py-2.5 rounded-xl inline-flex items-center gap-2 text-sm disabled:opacity-60">
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                    {saving ? '创建中…' : '创建活动'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function EventCard({ ev, index, user, busy, onAttend, onCancel, onDelete }) {
  const color = ev.color || '#6366f1';
  const isCreator = user && ev.author && user.id === ev.author.id;
  const status = ev.isAttending;
  const isUpcoming = !ev.end_time || ev.end_time * 1000 > Date.now();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.05, 0.4) }}
      className="card overflow-hidden relative group surface-hover"
    >
      {/* color accent bar */}
      <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${color}, ${color}55)` }} />
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full blur-3xl opacity-20 pointer-events-none" style={{ background: color }} />

      <div className="relative p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="p-2 rounded-xl shrink-0" style={{ background: `${color}1a`, color }}>
              <CalendarDays size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="font-display font-bold text-lg leading-snug truncate">{ev.title}</h3>
              {ev.author && (
                <div className="flex items-center gap-1.5 mt-1">
                  <Avatar user={ev.author} size={18} />
                  <span className="text-xs text-muted">{ev.author.displayName || ev.author.username}</span>
                </div>
              )}
            </div>
          </div>
          {!isUpcoming && <span className="chip text-xs" style={{ background: 'rgba(107,117,145,0.15)', color: 'var(--text-muted)' }}>已结束</span>}
        </div>

        {ev.description && <p className="text-sm text-muted line-clamp-3 mb-3 leading-relaxed">{ev.description}</p>}

        <div className="space-y-1.5 mb-4 text-sm">
          <div className="flex items-center gap-2 text-muted">
            <Clock size={14} style={{ color }} />
            <span>{formatTimeFull(ev.start_time)}{ev.end_time ? ` → ${formatTimeFull(ev.end_time)}` : ''}</span>
          </div>
          {ev.location && (
            <div className="flex items-center gap-2 text-muted">
              <MapPin size={14} style={{ color }} />
              <span className="truncate">{ev.location}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-muted">
            <Users size={14} style={{ color }} />
            <span>{formatNumber(ev.attendeeCount || 0)} 人参与</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {user ? (
            <>
              {status === 'attending' ? (
                <button onClick={() => onCancel(ev)} disabled={busy} className="flex-1 min-w-[120px] px-3 py-2 rounded-lg text-sm font-semibold inline-flex items-center justify-center gap-1.5 transition border" style={{ borderColor: `${color}66`, background: `${color}1a`, color }}>
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} 已报名
                </button>
              ) : (
                <button onClick={() => onAttend(ev, 'attending')} disabled={busy} className="flex-1 min-w-[120px] btn-primary px-3 py-2 rounded-lg text-sm font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-60">
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} 报名参加
                </button>
              )}
              <button
                onClick={() => status === 'interested' ? onCancel(ev) : onAttend(ev, 'interested')}
                disabled={busy}
                className={`px-3 py-2 rounded-lg text-sm font-semibold inline-flex items-center justify-center gap-1.5 transition border ${status === 'interested' ? '' : 'hover:bg-surface-2 text-muted'}`}
                style={status === 'interested' ? { borderColor: '#f59e0b66', background: '#f59e0b1a', color: '#f59e0b' } : { borderColor: 'var(--border)' }}
              >
                <Star size={14} /> {status === 'interested' ? '已感兴趣' : '感兴趣'}
              </button>
              {isCreator && (
                <button onClick={() => onDelete(ev)} disabled={busy} title="删除活动" className="p-2 rounded-lg border hover:bg-red-500/15 hover:text-red-400 text-muted transition" style={{ borderColor: 'var(--border)' }}>
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </button>
              )}
            </>
          ) : (
            <p className="text-xs text-muted">登录后即可报名</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
