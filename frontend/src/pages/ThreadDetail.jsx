import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Eye, MessageCircle, Flame, Bookmark, Pin, Lock, CheckCircle2, Star, Trash2,
  Pencil, Award, Send, ArrowLeft, Flag, MoreHorizontal, Megaphone, HelpCircle
} from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Avatar from '../components/ui/Avatar.jsx';
import Markdown from '../components/ui/Markdown.jsx';
import ReactionBar from '../components/ui/ReactionBar.jsx';
import Pagination from '../components/ui/Pagination.jsx';
import { FullSpinner, EmptyState } from '../components/ui/Loading.jsx';
import { formatTime, formatTimeFull, formatNumber, getThreadTypeMeta, getRoleLabel, getReactionEmoji } from '../lib/utils.js';

export default function ThreadDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [thread, setThread] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [replyContent, setReplyContent] = useState('');
  const [replying, setReplying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editPostId, setEditPostId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [showModMenu, setShowModMenu] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const replyRef = useRef(null);

  const canModerate = user && ['admin', 'moderator'].includes(user.role);
  const isAuthor = user && thread && user.id === thread.userId;

  useEffect(() => {
    setLoading(true);
    api.getThread(id).then(t => {
      setThread(t);
      setBookmarked(t.bookmarked);
    }).catch(() => setThread(null)).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    api.getPosts(id, `?page=${page}&limit=15`).then(r => {
      setPosts(r.items || []);
      setTotal(r.total || 0);
    }).catch(() => {});
  }, [id, page]);

  const submitReply = async () => {
    if (!user) { navigate('/login'); return; }
    if (!replyContent.trim()) { toast('请输入回复内容', 'error'); return; }
    setSubmitting(true);
    try {
      const newPost = await api.createPost(id, { content: replyContent });
      setPosts(prev => [...prev, newPost]);
      setTotal(t => t + 1);
      setReplyContent('');
      setReplying(false);
      setThread(t => ({ ...t, postCount: t.postCount + 1 }));
      toast('回复成功', 'success');
    } catch (e) { toast(e.message, 'error'); }
    finally { setSubmitting(false); }
  };

  const handleBookmark = async () => {
    if (!user) { navigate('/login'); return; }
    try {
      const res = await api.toggleBookmark(id);
      setBookmarked(res.bookmarked);
      toast(res.bookmarked ? '已收藏' : '已取消收藏', 'success');
    } catch (e) { toast(e.message, 'error'); }
  };

  const moderate = async (action) => {
    try {
      const updated = await api.moderateThread(id, { [action]: !thread[action === 'pinned' ? 'pinned' : action === 'locked' ? 'locked' : 'featured'] });
      setThread(updated);
      setShowModMenu(false);
      toast('操作成功', 'success');
    } catch (e) { toast(e.message, 'error'); }
  };

  const deleteThread = async () => {
    if (!confirm('确定删除这个主题吗？此操作不可撤销。')) return;
    try {
      await api.deleteThread(id);
      toast('主题已删除', 'success');
      navigate('/');
    } catch (e) { toast(e.message, 'error'); }
  };

  const markBest = async (postId) => {
    try {
      await api.markBestAnswer(postId);
      setPosts(prev => prev.map(p => ({ ...p, isBestAnswer: p.id === postId })));
      setThread(t => ({ ...t, solved: true }));
      toast('已设为最佳答案', 'success');
    } catch (e) { toast(e.message, 'error'); }
  };

  const saveEdit = async (postId) => {
    try {
      const updated = await api.updatePost(postId, { content: editContent });
      setPosts(prev => prev.map(p => p.id === postId ? updated : p));
      setEditPostId(null);
      toast('编辑成功', 'success');
    } catch (e) { toast(e.message, 'error'); }
  };

  const deletePost = async (postId) => {
    if (!confirm('确定删除这条回复吗？')) return;
    try {
      await api.deletePost(postId);
      setPosts(prev => prev.filter(p => p.id !== postId));
      setTotal(t => t - 1);
      setThread(t => ({ ...t, postCount: t.postCount - 1 }));
      toast('已删除', 'success');
    } catch (e) { toast(e.message, 'error'); }
  };

  const votePoll = async (optionIds) => {
    if (!user) { navigate('/login'); return; }
    try {
      const res = await api.votePoll(id, { optionIds });
      setThread(t => ({ ...t, poll: { ...t.poll, ...res } }));
      toast('投票成功', 'success');
    } catch (e) { toast(e.message, 'error'); }
  };

  if (loading) return <FullSpinner />;
  if (!thread) return <EmptyState icon={HelpCircle} title="主题不存在" desc="该主题可能已被删除" action={<Link to="/" className="btn-primary px-5 py-2.5 rounded-xl">返回首页</Link>} />;

  const meta = getThreadTypeMeta(thread.type);
  const poll = thread.poll;
  const hasVoted = poll && poll.userVotes && poll.userVotes.length > 0;

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-5 py-6">
      <Link to={thread.category ? `/category/${thread.category.slug}` : '/'} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-brand-400 transition mb-4">
        <ArrowLeft size={15} /> {thread.category?.name || '返回'}
      </Link>

      {/* Thread header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card p-5 sm:p-7 mb-4">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="chip" style={{ background: `${meta.color}1a`, color: meta.color, borderColor: `${meta.color}33` }}>{meta.label}</span>
          {thread.pinned && <span className="chip" style={{ background: '#f59e0b1a', color: '#f59e0b' }}><Pin size={11} /> 置顶</span>}
          {thread.featured && <span className="chip" style={{ background: '#ec48991a', color: '#ec4899' }}><Star size={11} /> 精华</span>}
          {thread.locked && <span className="chip" style={{ background: '#6b75911a', color: '#9aa3bd' }}><Lock size={11} /> 锁定</span>}
          {thread.solved && <span className="chip" style={{ background: '#10b9811a', color: '#10b981' }}><CheckCircle2 size={11} /> 已解决</span>}
        </div>

        <h1 className="font-display text-2xl sm:text-3xl font-bold leading-tight mb-4">{thread.title}</h1>

        <div className="flex items-center gap-3 mb-5">
          <Link to={`/u/${thread.author.username}`}><Avatar user={thread.author} size={44} showStatus ring /></Link>
          <div className="flex-1 min-w-0">
            <Link to={`/u/${thread.author.username}`} className="font-semibold hover:text-brand-400 transition flex items-center gap-1.5">
              {thread.author.displayName || thread.author.username}
              <span className="chip text-[10px] py-0" style={{ color: thread.author.role === 'admin' ? '#ef4444' : thread.author.role === 'moderator' ? '#f59e0b' : '#6366f1' }}>
                {getRoleLabel(thread.author.role)}
              </span>
            </Link>
            <div className="text-xs text-muted flex items-center gap-3">
              <span>{formatTime(thread.createdAt)}</span>
              {thread.author.title && <span>· {thread.author.title}</span>}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={handleBookmark} className={`p-2 rounded-lg transition ${bookmarked ? 'text-brand-400 bg-brand-500/10' : 'hover:bg-surface-2 text-muted'}`} title="收藏">
              <Bookmark size={18} fill={bookmarked ? 'currentColor' : 'none'} />
            </button>
            {(isAuthor || canModerate) && (
              <button onClick={deleteThread} className="p-2 rounded-lg hover:bg-red-500/10 text-muted hover:text-red-400 transition" title="删除">
                <Trash2 size={18} />
              </button>
            )}
            {canModerate && (
              <div className="relative">
                <button onClick={() => setShowModMenu(s => !s)} className="p-2 rounded-lg hover:bg-surface-2 text-muted transition">
                  <MoreHorizontal size={18} />
                </button>
                {showModMenu && (
                  <div className="absolute right-0 top-full mt-1 w-40 glass-strong rounded-xl py-1.5 shadow-2xl border z-30" style={{ borderColor: 'var(--border)' }}>
                    <button onClick={() => moderate('pinned')} className="w-full text-left px-3 py-2 text-sm hover:bg-surface-2 flex items-center gap-2"><Pin size={14} /> {thread.pinned ? '取消置顶' : '置顶'}</button>
                    <button onClick={() => moderate('locked')} className="w-full text-left px-3 py-2 text-sm hover:bg-surface-2 flex items-center gap-2"><Lock size={14} /> {thread.locked ? '解锁' : '锁定'}</button>
                    <button onClick={() => moderate('featured')} className="w-full text-left px-3 py-2 text-sm hover:bg-surface-2 flex items-center gap-2"><Star size={14} /> {thread.featured ? '取消精华' : '加精'}</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <Markdown>{thread.content}</Markdown>

        {thread.tags && thread.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-5 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
            {thread.tags.map(tag => (
              <Link key={tag.id} to={`/tag/${tag.slug}`} className="chip hover:scale-105 transition" style={{ color: tag.color, borderColor: `${tag.color}40` }}>#{tag.name}</Link>
            ))}
          </div>
        )}

        {/* Poll */}
        {poll && (
          <div className="mt-5 p-4 rounded-xl bg-surface-2 border" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Megaphone size={16} className="text-violetx-500" />
              <span className="font-semibold">{poll.question}</span>
              {poll.multi_vote ? <span className="chip text-[10px]">多选</span> : null}
            </div>
            <div className="space-y-2">
              {poll.options.map(opt => {
                const pct = poll.totalVotes > 0 ? (opt.vote_count / poll.totalVotes * 100) : 0;
                const voted = poll.userVotes?.includes(opt.id);
                return (
                  <button key={opt.id} disabled={hasVoted} onClick={() => votePoll([opt.id])}
                    className={`w-full text-left p-3 rounded-lg border transition relative overflow-hidden ${voted ? 'border-brand-500' : 'border-default hover:border-brand-400'} ${hasVoted ? 'cursor-default' : 'cursor-pointer hover:bg-surface'}`}>
                    {hasVoted && (
                      <div className="absolute inset-0 bg-brand-500/10" style={{ width: `${pct}%` }} />
                    )}
                    <div className="relative flex items-center justify-between">
                      <span className="flex items-center gap-2">{voted && <CheckCircle2 size={15} className="text-brand-400" />} {opt.text}</span>
                      {hasVoted && <span className="text-sm font-medium text-muted">{opt.vote_count} ({pct.toFixed(0)}%)</span>}
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted mt-3">{poll.totalVotes} 人参与 {hasVoted && '· 你已投票'}</p>
          </div>
        )}

        {/* Thread footer stats + reactions */}
        <div className="flex flex-wrap items-center gap-4 mt-5 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <ReactionBar targetType="thread" targetId={thread.id} reactions={thread.reactions || []} userReaction={thread.userReaction} />
          <div className="flex items-center gap-4 text-sm text-muted ml-auto">
            <span className="flex items-center gap-1"><Eye size={15} /> {formatNumber(thread.views)}</span>
            <span className="flex items-center gap-1"><MessageCircle size={15} /> {formatNumber(thread.postCount)}</span>
            <span className="flex items-center gap-1"><Flame size={15} /> {formatNumber(thread.reactionCount)}</span>
          </div>
        </div>
      </motion.div>

      {/* Posts */}
      <div className="mb-4 flex items-center gap-2">
        <h2 className="font-display font-bold text-lg">{total} 条回复</h2>
        <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
      </div>

      {posts.length === 0 ? (
        <EmptyState icon={MessageCircle} title="还没有回复" desc="成为第一个回复的人" />
      ) : (
        <div className="space-y-3">
          {posts.map((post, i) => (
            <motion.div key={post.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.3) }}
              className={`card p-4 sm:p-5 ${post.isBestAnswer ? 'border-emerald-500/40' : ''}`} style={post.isBestAnswer ? { borderColor: 'rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.03)' } : {}}>
              {post.isBestAnswer && (
                <div className="inline-flex items-center gap-1.5 chip mb-3" style={{ background: '#10b9811a', color: '#10b981', borderColor: '#10b98133' }}>
                  <CheckCircle2 size={13} /> 最佳答案
                </div>
              )}
              <div className="flex gap-3">
                <Link to={`/u/${post.author.username}`}><Avatar user={post.author} size={38} showStatus /></Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Link to={`/u/${post.author.username}`} className="font-semibold text-sm hover:text-brand-400 transition flex items-center gap-1.5">
                      {post.author.displayName || post.author.username}
                      <span className="chip text-[10px] py-0" style={{ color: post.author.role === 'admin' ? '#ef4444' : post.author.role === 'moderator' ? '#f59e0b' : '#6366f1' }}>{getRoleLabel(post.author.role)}</span>
                    </Link>
                    <span className="text-xs text-muted">{formatTime(post.createdAt)}</span>
                    {post.edited && <span className="text-[10px] text-muted">(已编辑)</span>}
                  </div>

                  {editPostId === post.id ? (
                    <div>
                      <textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={4}
                        className="input-field font-mono text-sm" />
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => saveEdit(post.id)} className="btn-primary px-4 py-1.5 rounded-lg text-sm">保存</button>
                        <button onClick={() => setEditPostId(null)} className="px-4 py-1.5 rounded-lg text-sm hover:bg-surface-2">取消</button>
                      </div>
                    </div>
                  ) : (
                    <Markdown>{post.content}</Markdown>
                  )}

                  <div className="flex items-center gap-3 mt-3">
                    <ReactionBar targetType="post" targetId={post.id} reactions={post.reactions || []} userReaction={post.userReaction} />
                    <div className="flex items-center gap-1 ml-auto">
                      {thread.type === 'question' && !thread.locked && (isAuthor || canModerate) && !post.isBestAnswer && (
                        <button onClick={() => markBest(post.id)} className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-muted hover:text-emerald-400 transition text-xs flex items-center gap-1" title="设为最佳答案">
                          <Award size={15} /> 最佳
                        </button>
                      )}
                      {user && (user.id === post.userId || canModerate) && editPostId !== post.id && (
                        <>
                          <button onClick={() => { setEditPostId(post.id); setEditContent(post.content); }} className="p-1.5 rounded-lg hover:bg-surface-2 text-muted hover:text-current transition" title="编辑">
                            <Pencil size={15} />
                          </button>
                          <button onClick={() => deletePost(post.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted hover:text-red-400 transition" title="删除">
                            <Trash2 size={15} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Pagination page={page} total={total} limit={15} onChange={setPage} />

      {/* Reply box */}
      {thread.locked && !canModerate ? (
        <div className="card p-6 text-center text-muted mt-4">
          <Lock size={24} className="mx-auto mb-2 opacity-50" />
          此主题已锁定，无法回复
        </div>
      ) : (
        <div className="card p-4 sm:p-5 mt-4" ref={replyRef}>
          <div className="flex gap-3">
            {user && <Avatar user={user} size={38} />}
            <div className="flex-1">
              <textarea
                value={replyContent}
                onChange={e => setReplyContent(e.target.value)}
                onFocus={() => user ? setReplying(true) : navigate('/login')}
                placeholder={user ? '写下你的回复…支持 Markdown' : '请先登录后回复'}
                rows={replying ? 4 : 1}
                className="input-field resize-none transition-all"
              />
              {replying && (
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-muted">支持 Markdown 格式 · **粗体** · `代码` · [链接](url)</span>
                  <div className="flex gap-2">
                    <button onClick={() => { setReplying(false); setReplyContent(''); }} className="px-4 py-1.5 rounded-lg text-sm hover:bg-surface-2">取消</button>
                    <button onClick={submitReply} disabled={submitting} className="btn-primary px-5 py-1.5 rounded-lg text-sm flex items-center gap-1.5 disabled:opacity-50">
                      <Send size={14} /> {submitting ? '发送中…' : '回复'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
