require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:5174',
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://localhost:')) {
      return callback(null, true);
    }
    callback(null, true);
  },
  credentials: true,
};

const io = new Server(server, {
  cors: corsOptions,
});
app.set('io', io);

// Security Middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/stories', require('./routes/stories'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/messages', require('./routes/messages'));

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.message);
  res.status(500).json({ msg: 'An unexpected server error occurred' });
});

// ---- Realtime: Socket.io with Access Token Authentication ----
const online = new Map(); // userId -> open socket count

io.use((socket, next) => {
  try {
    const rawToken = socket.handshake.auth?.token;
    if (!rawToken) return next(new Error('Authentication token required'));
    const token = rawToken.replace(/^Bearer\s+/i, '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch (err) {
    next(new Error('Authentication failed'));
  }
});

io.on('connection', (socket) => {
  const userId = socket.userId;
  if (!userId) return;

  socket.join('u:' + userId);
  online.set(userId, (online.get(userId) || 0) + 1);

  io.emit('presence', { userId, online: true });
  socket.emit('online-users', [...online.keys()]);

  socket.on('typing', ({ to }) => {
    if (to) io.to('u:' + to).emit('typing', { from: userId });
  });

  socket.on('disconnect', () => {
    const count = (online.get(userId) || 1) - 1;
    if (count <= 0) {
      online.delete(userId);
      io.emit('presence', { userId, online: false });
    } else {
      online.set(userId, count);
    }
  });
});

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected successfully');
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((e) => console.error('Database connection error:', e.message));
