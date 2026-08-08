import db from './db.js';
import { publicUser } from './middleware/auth.js';

export function setupSocket(io) {
  // Track online users: socket.id -> userId
  const onlineUsers = new Map();
  const userSockets = new Map(); // userId -> Set of socket ids

  io.on('connection', (socket) => {
    // Authenticate via handshake auth
    const userId = socket.handshake.auth?.userId;
    if (userId) {
      onlineUsers.set(socket.id, userId);
      if (!userSockets.has(userId)) userSockets.set(userId, new Set());
      userSockets.get(userId).add(socket.id);
      db.prepare("UPDATE users SET status='online', last_seen=? WHERE id=?").run(Math.floor(Date.now() / 1000), userId);
      socket.join(`user:${userId}`);
      io.emit('presence:update', { userId, status: 'online' });
    }

    const broadcastOnlineCount = () => {
      const uniqueUsers = new Set(onlineUsers.values());
      io.emit('presence:count', { count: uniqueUsers.size });
    };
    broadcastOnlineCount();

    // Join a chat room
    socket.on('chat:join', (roomId) => {
      socket.join(`chat:${roomId}`);
    });
    socket.on('chat:leave', (roomId) => {
      socket.leave(`chat:${roomId}`);
    });
    socket.on('chat:message', (data) => {
      // data: { roomId, content, user }
      const msg = {
        id: Date.now(),
        roomId: data.roomId,
        content: data.content,
        createdAt: Math.floor(Date.now() / 1000),
        sender: data.user,
      };
      io.to(`chat:${data.roomId}`).emit('chat:message', msg);
    });
    socket.on('chat:typing', (data) => {
      socket.to(`chat:${data.roomId}`).emit('chat:typing', { user: data.user, roomId: data.roomId });
    });
    socket.on('chat:stop-typing', (data) => {
      socket.to(`chat:${data.roomId}`).emit('chat:stop-typing', { roomId: data.roomId });
    });

    // Direct messages
    socket.on('dm:join', (conversationId) => {
      socket.join(`dm:${conversationId}`);
    });
    socket.on('dm:message', (data) => {
      // data: { conversationId, content, recipientId, user }
      io.to(`dm:${data.conversationId}`).emit('dm:message', {
        id: Date.now(),
        conversationId: data.conversationId,
        content: data.content,
        createdAt: Math.floor(Date.now() / 1000),
        sender: data.user,
      });
      // notify recipient
      if (data.recipientId) {
        io.to(`user:${data.recipientId}`).emit('notification', {
          type: 'message',
          actor: data.user,
          content: `${data.user?.displayName || data.user?.username} 给你发了一条消息`,
          createdAt: Math.floor(Date.now() / 1000),
        });
      }
    });

    // Live thread view sync
    socket.on('thread:view', (threadId) => {
      socket.join(`thread:${threadId}`);
    });

    socket.on('disconnect', () => {
      const uid = onlineUsers.get(socket.id);
      onlineUsers.delete(socket.id);
      if (uid) {
        const socks = userSockets.get(uid);
        if (socks) {
          socks.delete(socket.id);
          if (socks.size === 0) {
            userSockets.delete(uid);
            db.prepare("UPDATE users SET status='offline', last_seen=? WHERE id=?").run(Math.floor(Date.now() / 1000), uid);
            io.emit('presence:update', { userId: uid, status: 'offline' });
          }
        }
      }
      broadcastOnlineCount();
    });
  });
}
