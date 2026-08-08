import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Hash, Send, Plus, X, Users } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { getSocket } from '../lib/socket.js';
import Avatar from '../components/ui/Avatar.jsx';
import { FullSpinner, EmptyState } from '../components/ui/Loading.jsx';
import { formatTime } from '../lib/utils.js';

export default function Chat() {
  const { user } = useAuth();
  const toast = useToast();
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [newRoom, setNewRoom] = useState({ name: '', description: '' });
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    api.getChatRooms().then(r => {
      setRooms(r.items || []);
      if ((r.items || []).length > 0) setActiveRoom(r.items[0]);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    api.getOnline().then(r => setOnlineUsers((r.items || []).length)).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!activeRoom) return;
    api.getChatMessages(activeRoom.id).then(r => {
      setMessages(r.items || []);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }).catch(() => {});

    const socket = getSocket();
    socketRef.current = socket;
    socket.emit('chat:join', activeRoom.id);

    const onMessage = (msg) => {
      if (msg.roomId === activeRoom.id) {
        setMessages(prev => [...prev, msg]);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    };
    const onTyping = (data) => {
      if (data.roomId === activeRoom.id && data.user?.id !== user?.id) {
        setTypingUsers(prev => new Set(prev).add(data.user?.displayName || data.user?.username));
        setTimeout(() => setTypingUsers(prev => { const n = new Set(prev); n.delete(data.user?.displayName || data.user?.username); return n; }), 3000);
      }
    };
    const onStopTyping = (data) => {
      if (data.roomId === activeRoom.id) setTypingUsers(new Set());
    };

    socket.on('chat:message', onMessage);
    socket.on('chat:typing', onTyping);
    socket.on('chat:stop-typing', onStopTyping);

    return () => {
      socket.emit('chat:leave', activeRoom.id);
      socket.off('chat:message', onMessage);
      socket.off('chat:typing', onTyping);
      socket.off('chat:stop-typing', onStopTyping);
    };
  }, [activeRoom, user]);

  const send = async () => {
    if (!input.trim() || !activeRoom) return;
    const content = input.trim();
    setInput('');
    // optimistic via socket
    const socket = getSocket();
    socket.emit('chat:message', { roomId: activeRoom.id, content, user: { id: user.id, username: user.username, displayName: user.displayName, avatar: user.avatar, role: user.role } });
    socket.emit('chat:stop-typing', { roomId: activeRoom.id });
    // persist to db
    try {
      await api.sendChatMessage(activeRoom.id, { content });
    } catch (e) { /* socket already delivered */ }
  };

  const handleTyping = () => {
    if (!input.trim()) return;
    const socket = getSocket();
    socket.emit('chat:typing', { roomId: activeRoom.id, user: { id: user.id, displayName: user.displayName || user.username } });
  };

  const createRoom = async () => {
    if (!newRoom.name.trim()) { toast('请输入房间名', 'error'); return; }
    try {
      const room = await api.createChatRoom(newRoom);
      setRooms(prev => [...prev, room]);
      setActiveRoom(room);
      setShowCreate(false);
      setNewRoom({ name: '', description: '' });
      toast('房间已创建', 'success');
    } catch (e) { toast(e.message, 'error'); }
  };

  if (loading) return <FullSpinner />;

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Room list */}
      <div className="w-64 shrink-0 border-r glass flex flex-col" style={{ borderColor: 'var(--border)' }}>
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
          <div>
            <h2 className="font-display font-bold flex items-center gap-2"><Hash size={18} className="text-brand-400" /> 聊天室</h2>
            <p className="text-xs text-muted flex items-center gap-1 mt-0.5"><Users size={11} /> {onlineUsers} 人在线</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="p-2 rounded-lg hover:bg-surface-2 transition" title="创建房间">
            <Plus size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {rooms.map(room => (
            <button key={room.id} onClick={() => setActiveRoom(room)}
              className={`w-full text-left p-3 rounded-xl transition ${activeRoom?.id === room.id ? 'bg-brand-500/15' : 'hover:bg-surface-2'}`}>
              <div className="flex items-center gap-2">
                <Hash size={15} className="text-muted" />
                <span className="font-medium text-sm flex-1 truncate">{room.name}</span>
              </div>
              <p className="text-xs text-muted truncate mt-0.5 ml-5">{room.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      {activeRoom ? (
        <div className="flex-1 flex flex-col min-w-0">
          <div className="p-4 border-b glass flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
            <Hash size={20} className="text-brand-400" />
            <div>
              <h3 className="font-display font-bold">{activeRoom.name}</h3>
              <p className="text-xs text-muted">{activeRoom.description}</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-1">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted text-sm">还没有消息，发条消息开始聊天吧</p>
              </div>
            ) : (
              messages.map((msg, i) => {
                const prev = messages[i - 1];
                const sameSender = prev && prev.sender?.id === msg.sender?.id && (msg.createdAt - prev.createdAt < 300);
                const isMe = msg.sender?.id === user?.id;
                return (
                  <div key={msg.id || i} className={`flex gap-2.5 ${sameSender ? 'mt-0.5' : 'mt-3'}`}>
                    <div className="w-9 shrink-0">
                      {!sameSender && <Avatar user={msg.sender} size={36} showStatus />}
                    </div>
                    <div className="flex-1 min-w-0">
                      {!sameSender && (
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <span className="font-medium text-sm" style={{ color: msg.sender?.role === 'admin' ? '#ef4444' : msg.sender?.role === 'moderator' ? '#f59e0b' : undefined }}>
                            {msg.sender?.displayName || msg.sender?.username}{isMe && ' (我)'}
                          </span>
                          <span className="text-[10px] text-muted">{formatTime(msg.createdAt)}</span>
                        </div>
                      )}
                      <div className={`inline-block px-3 py-1.5 rounded-2xl text-sm break-words ${isMe ? 'bg-brand-500/15 text-current' : 'bg-surface-2'}`} style={{ maxWidth: '85%' }}>
                        {msg.content}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            {typingUsers.size > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted ml-12 mt-2">
                <span className="flex gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
                {[...typingUsers].join('、')} 正在输入…
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 border-t glass" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2">
              <input value={input} onChange={e => setInput(e.target.value)} onKeyUp={handleTyping}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder={`在 #${activeRoom.name} 中发送消息…`}
                className="input-field flex-1 rounded-full" />
              <button onClick={send} disabled={!input.trim()} className="btn-primary p-2.5 rounded-full disabled:opacity-40">
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <EmptyState icon={Hash} title="选择一个聊天室" desc="从左侧选择房间开始聊天" />
      )}

      {/* Create room modal */}
      <AnimatePresence>
        {showCreate && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowCreate(false)} className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90%] max-w-md glass-strong rounded-2xl p-6 border shadow-2xl" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-bold text-lg">创建聊天室</h3>
                <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-lg hover:bg-surface-2"><X size={18} /></button>
              </div>
              <div className="space-y-3">
                <input value={newRoom.name} onChange={e => setNewRoom(n => ({ ...n, name: e.target.value }))}
                  placeholder="房间名称" className="input-field" />
                <input value={newRoom.description} onChange={e => setNewRoom(n => ({ ...n, description: e.target.value }))}
                  placeholder="房间描述（可选）" className="input-field" />
                <button onClick={createRoom} className="btn-primary w-full py-2.5 rounded-xl">创建</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
