import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MessageSquare, ArrowLeft, Search } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { getSocket } from '../lib/socket.js';
import Avatar from '../components/ui/Avatar.jsx';
import { FullSpinner, EmptyState } from '../components/ui/Loading.jsx';
import { formatTime } from '../lib/utils.js';

export default function Messages() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [mobileView, setMobileView] = useState('list');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    api.getConversations().then(r => {
      setConversations(r.items || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!activeConv) return;
    api.getMessages(activeConv.id, '?limit=100').then(r => {
      setMessages(r.items || []);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }).catch(() => {});

    const socket = getSocket();
    socket.emit('dm:join', activeConv.id);
    const onMessage = (msg) => {
      if (msg.conversationId === activeConv.id) {
        setMessages(prev => [...prev, msg]);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    };
    socket.on('dm:message', onMessage);
    return () => { socket.off('dm:message', onMessage); };
  }, [activeConv]);

  const openConversation = (conv) => {
    setActiveConv(conv);
    setMobileView('chat');
    setMessages([]);
  };

  const sendMessage = async () => {
    if (!input.trim() || !activeConv) return;
    const content = input.trim();
    setInput('');
    const recipient = activeConv.members[0];
    const socket = getSocket();
    socket.emit('dm:message', {
      conversationId: activeConv.id,
      content,
      recipientId: recipient.id,
      user: { id: user.id, username: user.username, displayName: user.displayName, avatar: user.avatar, role: user.role },
    });
    // optimistic
    setMessages(prev => [...prev, { id: Date.now(), content, createdAt: Math.floor(Date.now() / 1000), sender: { id: user.id, username: user.username, displayName: user.displayName, avatar: user.avatar, role: user.role } }]);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    // persist
    try {
      await api.sendMessage(activeConv.id, { content });
      // refresh conversation list for last message
      api.getConversations().then(r => setConversations(r.items || [])).catch(() => {});
    } catch (e) { /* socket delivered */ }
  };

  if (loading) return <FullSpinner />;

  const otherMember = activeConv?.members[0];

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Conversation list */}
      <div className={`w-full sm:w-80 shrink-0 border-r glass flex-col ${mobileView === 'list' ? 'flex' : 'hidden sm:flex'}`} style={{ borderColor: 'var(--border)' }}>
        <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-display font-bold flex items-center gap-2"><MessageSquare size={18} className="text-brand-400" /> 私信</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted">
              还没有对话<br />去用户主页发起私信吧
            </div>
          ) : conversations.map(conv => {
            const m = conv.members[0];
            return (
              <button key={conv.id} onClick={() => openConversation(conv)}
                className={`w-full text-left p-3 flex gap-3 hover:bg-surface-2 transition border-b ${activeConv?.id === conv.id ? 'bg-brand-500/10' : ''}`}
                style={{ borderColor: 'var(--border)' }}>
                <Avatar user={m} size={44} showStatus />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm truncate">{m.displayName || m.username}</span>
                    {conv.lastMessageAt && <span className="text-[10px] text-muted shrink-0 ml-1">{formatTime(conv.lastMessageAt)}</span>}
                  </div>
                  <p className="text-xs text-muted truncate mt-0.5">{conv.lastMessage || '开始对话…'}</p>
                </div>
                {conv.unread > 0 && (
                  <span className="self-center min-w-[20px] h-5 px-1.5 rounded-full bg-brand-500 text-white text-[10px] font-bold flex items-center justify-center">{conv.unread}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat area */}
      <div className={`flex-1 flex flex-col min-w-0 ${mobileView === 'chat' ? 'flex' : 'hidden sm:flex'}`}>
        {activeConv ? (
          <>
            <div className="p-4 border-b glass flex items-center gap-3" style={{ borderColor: 'var(--border)' }}>
              <button onClick={() => setMobileView('list')} className="sm:hidden p-1.5 rounded-lg hover:bg-surface-2"><ArrowLeft size={18} /></button>
              <Avatar user={otherMember} size={36} showStatus />
              <div>
                <h3 className="font-semibold text-sm">{otherMember.displayName || otherMember.username}</h3>
                <p className="text-xs text-muted">{otherMember.status === 'online' ? '在线' : '离线'}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {messages.map((msg, i) => {
                const isMe = msg.sender?.id === user?.id;
                const prev = messages[i - 1];
                const sameSender = prev && prev.sender?.id === msg.sender?.id && (msg.createdAt - prev.createdAt < 300);
                return (
                  <div key={msg.id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${sameSender ? 'mt-0.5' : 'mt-3'}`}>
                    <div className={`max-w-[75%] ${isMe ? 'order-2' : ''}`}>
                      <div className={`px-3.5 py-2 rounded-2xl text-sm break-words ${isMe ? 'btn-primary rounded-br-md' : 'bg-surface-2 rounded-bl-md'}`}>
                        {msg.content}
                      </div>
                      <div className={`text-[10px] text-muted mt-0.5 ${isMe ? 'text-right' : 'text-left'}`}>{formatTime(msg.createdAt)}</div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-3 border-t glass" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2">
                <input value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder="发送消息…" className="input-field flex-1 rounded-full" />
                <button onClick={sendMessage} disabled={!input.trim()} className="btn-primary p-2.5 rounded-full disabled:opacity-40">
                  <Send size={18} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <EmptyState icon={MessageSquare} title="选择一个对话" desc="从左侧选择对话开始聊天" />
        )}
      </div>
    </div>
  );
}
