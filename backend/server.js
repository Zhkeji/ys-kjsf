import express from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import rateLimit from 'express-rate-limit';

import db from './db.js';
import { seed } from './seed.js';
import { setupSocket } from './socket.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import categoryRoutes from './routes/categories.js';
import threadRoutes from './routes/threads.js';
import socialRoutes from './routes/social.js';
import notificationRoutes from './routes/notifications.js';
import messageRoutes from './routes/messages.js';
import chatRoutes from './routes/chat.js';
import searchRoutes from './routes/search.js';
import eventRoutes from './routes/events.js';
import adminRoutes from './routes/admin.js';
import uploadRoutes, { uploadDir } from './routes/upload.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files
app.use('/uploads', express.static(uploadDir));

// Rate limiting
const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false });
app.use('/api', apiLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/threads', threadRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: Date.now() }));

// Serve frontend in production
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(frontendDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
  res.sendFile(path.join(frontendDist, 'index.html'), (err) => {
    if (err) next();
  });
});

// Socket.io
setupSocket(io);

// Seed database
seed();

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 YS Forum server running on http://localhost:${PORT}`);
  console.log(`📊 Socket.io enabled for real-time features`);
});
