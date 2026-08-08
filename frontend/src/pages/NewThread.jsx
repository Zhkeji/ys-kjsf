import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Bold, Italic, Code, List, Link2, Quote, Heading, Eye, Send, X, Plus,
  MessageCircle, HelpCircle, BookOpen, Vote, Megaphone, Image as ImageIcon
} from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Markdown from '../components/ui/Markdown.jsx';
import { FullSpinner } from '../components/ui/Loading.jsx';

const TYPES = [
  { key: 'discussion', label: '讨论', icon: MessageCircle, color: '#6366f1', desc: '发起一个话题讨论' },
  { key: 'question', label: '提问', icon: HelpCircle, color: '#f59e0b', desc: '寻求帮助与解答' },
  { key: 'guide', label: '教程', icon: BookOpen, color: '#10b981', desc: '分享知识与经验' },
  { key: 'poll', label: '投票', icon: Vote, color: '#8b5cf6', desc: '发起投票收集意见' },
  { key: 'announcement', label: '公告', icon: Megaphone, color: '#ef4444', desc: '发布重要公告' },
];

export default function NewThread() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const textareaRef = useRef(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState(false);

  const [form, setForm] = useState({
    title: '',
    content: '',
    categoryId: '',
    type: 'discussion',
    tags: [],
  });
  const [tagInput, setTagInput] = useState('');
  const [allTags, setAllTags] = useState([]);
  const [poll, setPoll] = useState({ question: '', options: ['', ''], multiVote: false });
  const [showPoll, setShowPoll] = useState(false);

  useEffect(() => {
    Promise.all([api.getCategories(), api.getTags()])
      .then(([c, t]) => {
        const cats = (c.items || []).filter(cat => !cat.parent_id || (c.items || []).some(p => p.id === cat.parent_id));
        setCategories(c.items || []);
        setAllTags((t.items || []));
        if ((c.items || []).length > 0) setForm(f => ({ ...f, categoryId: f.categoryId || (c.items || []).find(cat => !cat.parent_id)?.id || (c.items||[])[0]?.id }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const insertMarkdown = (before, after = '', placeholder = '') => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = form.content.slice(start, end) || placeholder;
    const newText = form.content.slice(0, start) + before + selected + after + form.content.slice(end);
    setForm(f => ({ ...f, content: newText }));
    setTimeout(() => {
      ta.focus();
      ta.selectionStart = start + before.length;
      ta.selectionEnd = start + before.length + selected.length;
    }, 0);
  };

  const addTag = (tag) => {
    const t = typeof tag === 'string' ? tag : tag.name;
    if (t && !form.tags.includes(t) && form.tags.length < 8) {
      setForm(f => ({ ...f, tags: [...f.tags, t] }));
    }
    setTagInput('');
  };

  const removeTag = (t) => setForm(f => ({ ...f, tags: f.tags.filter(x => x !== t) }));

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await api.uploadImage(file);
      insertMarkdown(`![图片](${res.url})`, '', '');
      toast('图片已上传', 'success');
    } catch (err) { toast(err.message, 'error'); }
  };

  const submit = async () => {
    if (!form.title.trim()) { toast('请输入标题', 'error'); return; }
    if (!form.content.trim()) { toast('请输入内容', 'error'); return; }
    if (!form.categoryId) { toast('请选择版块', 'error'); return; }
    if (form.type === 'poll') {
      const validOptions = poll.options.filter(o => o.trim());
      if (validOptions.length < 2) { toast('投票至少需要2个选项', 'error'); return; }
    }
    setSubmitting(true);
    try {
      const body = { ...form, tags: form.tags };
      if (form.type === 'poll') body.poll = { ...poll, options: poll.options.filter(o => o.trim()) };
      const res = await api.createThread(body);
      toast('发布成功！', 'success');
      navigate(`/thread/${res.id}`);
    } catch (e) { toast(e.message, 'error'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <FullSpinner />;

  const toolbar = [
    { icon: Heading, action: () => insertMarkdown('## ', '', '标题'), title: '标题' },
    { icon: Bold, action: () => insertMarkdown('**', '**', '粗体'), title: '粗体' },
    { icon: Italic, action: () => insertMarkdown('*', '*', '斜体'), title: '斜体' },
    { icon: Code, action: () => insertMarkdown('`', '`', '代码'), title: '行内代码' },
    { icon: Quote, action: () => insertMarkdown('> ', '', '引用'), title: '引用' },
    { icon: List, action: () => insertMarkdown('- ', '', '列表项'), title: '列表' },
    { icon: Link2, action: () => insertMarkdown('[', '](url)', '链接文字'), title: '链接' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-5 py-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-2xl font-bold mb-1">发布新主题</h1>
        <p className="text-muted text-sm mb-6">分享你的想法，开启一场精彩的讨论</p>

        {/* Type selector */}
        <div className="card p-4 mb-4">
          <label className="text-sm font-medium mb-2.5 block">主题类型</label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {TYPES.map(t => (
              <button key={t.key} onClick={() => { setForm(f => ({ ...f, type: t.key })); setShowPoll(t.key === 'poll'); }}
                className={`p-3 rounded-xl border transition text-center ${form.type === t.key ? 'border-brand-500 bg-brand-500/10' : 'border-default hover:bg-surface-2'}`}
                style={form.type === t.key ? { borderColor: t.color, background: `${t.color}1a` } : {}}>
                <t.icon size={20} className="mx-auto mb-1.5" style={{ color: t.color }} />
                <p className="text-xs font-medium">{t.label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Category */}
        <div className="card p-4 mb-4">
          <label className="text-sm font-medium mb-2.5 block">选择版块</label>
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button key={cat.id} onClick={() => setForm(f => ({ ...f, categoryId: cat.id }))}
                className={`chip transition ${form.categoryId == cat.id ? 'scale-105' : 'hover:scale-105'}`}
                style={form.categoryId == cat.id ? { background: `${cat.color}1a`, color: cat.color, borderColor: cat.color } : {}}>
                <span className="w-2 h-2 rounded-full" style={{ background: cat.color }} />
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div className="card p-4 mb-4">
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="一句话描述你的主题…" maxLength={120}
            className="w-full bg-transparent text-xl font-display font-semibold outline-none placeholder:text-muted" />
        </div>

        {/* Editor */}
        <div className="card mb-4 overflow-hidden">
          <div className="flex items-center gap-1 px-3 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
            {toolbar.map((t, i) => (
              <button key={i} onClick={t.action} title={t.title} className="p-1.5 rounded-lg hover:bg-surface-2 text-muted hover:text-current transition">
                <t.icon size={17} />
              </button>
            ))}
            <label className="p-1.5 rounded-lg hover:bg-surface-2 text-muted hover:text-current transition cursor-pointer" title="插入图片">
              <ImageIcon size={17} />
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
            <div className="flex-1" />
            <button onClick={() => setPreview(p => !p)} className={`p-1.5 rounded-lg transition ${preview ? 'bg-surface-2 text-brand-400' : 'hover:bg-surface-2 text-muted'}`} title="预览">
              <Eye size={17} />
            </button>
          </div>
          {preview ? (
            <div className="p-5 min-h-[200px]"><Markdown>{form.content || '*预览为空*'}</Markdown></div>
          ) : (
            <textarea ref={textareaRef} value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              placeholder="支持 Markdown 格式…&#10;&#10;## 标题&#10;**粗体** *斜体* `代码`&#10;- 列表项&#10;> 引用&#10;[链接](url)"
              rows={12} className="w-full p-5 bg-transparent outline-none resize-y font-mono text-sm leading-relaxed" />
          )}
        </div>

        {/* Tags */}
        <div className="card p-4 mb-4">
          <label className="text-sm font-medium mb-2.5 block">标签 <span className="text-muted font-normal">(最多8个)</span></label>
          <div className="flex flex-wrap gap-2 mb-2">
            {form.tags.map(t => (
              <span key={t} className="chip" style={{ background: 'rgba(99,102,241,0.1)', color: '#a5b4fc' }}>
                #{t}
                <button onClick={() => removeTag(t)} className="hover:text-red-400"><X size={12} /></button>
              </span>
            ))}
          </div>
          <div className="relative">
            <input value={tagInput} onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput); } }}
              placeholder="输入标签后回车添加…" className="input-field" />
            {tagInput && allTags.filter(t => t.name.toLowerCase().includes(tagInput.toLowerCase()) && !form.tags.includes(t.name)).slice(0, 5).length > 0 && (
              <div className="absolute top-full mt-1 left-0 right-0 glass-strong rounded-xl py-1 z-20 border" style={{ borderColor: 'var(--border)' }}>
                {allTags.filter(t => t.name.toLowerCase().includes(tagInput.toLowerCase()) && !form.tags.includes(t.name)).slice(0, 5).map(t => (
                  <button key={t.id} onClick={() => addTag(t)} className="w-full text-left px-3 py-2 hover:bg-surface-2 text-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: t.color }} /> #{t.name} <span className="text-xs text-muted">{t.usage_count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Poll */}
        {showPoll && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="card p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium flex items-center gap-2"><Vote size={16} className="text-violetx-500" /> 投票设置</label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={poll.multiVote} onChange={e => setPoll(p => ({ ...p, multiVote: e.target.checked }))} className="accent-brand-500" />
                允许多选
              </label>
            </div>
            <input value={poll.question} onChange={e => setPoll(p => ({ ...p, question: e.target.value }))}
              placeholder="投票问题…" className="input-field mb-3" />
            <div className="space-y-2">
              {poll.options.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <input value={opt} onChange={e => setPoll(p => ({ ...p, options: p.options.map((o, j) => j === i ? e.target.value : o) }))}
                    placeholder={`选项 ${i + 1}`} className="input-field" />
                  {poll.options.length > 2 && (
                    <button onClick={() => setPoll(p => ({ ...p, options: p.options.filter((_, j) => j !== i) }))} className="p-2 rounded-lg hover:bg-red-500/10 text-muted hover:text-red-400">
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {poll.options.length < 10 && (
              <button onClick={() => setPoll(p => ({ ...p, options: [...p.options, ''] }))} className="mt-2 text-sm text-brand-400 hover:underline flex items-center gap-1">
                <Plus size={14} /> 添加选项
              </button>
            )}
          </motion.div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button onClick={() => navigate(-1)} className="px-5 py-2.5 rounded-xl font-medium hover:bg-surface-2 transition">取消</button>
          <button onClick={submit} disabled={submitting} className="btn-primary px-6 py-2.5 rounded-xl flex items-center gap-2 disabled:opacity-50">
            <Send size={17} /> {submitting ? '发布中…' : '发布主题'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
