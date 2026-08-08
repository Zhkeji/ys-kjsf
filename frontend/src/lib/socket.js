import { io } from 'socket.io-client';

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io({ transports: ['websocket', 'polling'], autoConnect: true });
  }
  return socket;
}

export function connectSocket(userId) {
  const s = getSocket();
  if (userId && !s.auth?.userId) {
    s.auth = { userId };
    s.connect();
  }
  return s;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
