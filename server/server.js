require('dotenv').config();
require('express-async-errors'); // lets async route handlers throw safely
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const path = require('path');
const http = require('http');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const { verifyMail } = require('./utils/mail');

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) { console.error('Set a long JWT_SECRET (16+ characters) in server/.env'); process.exit(1); }
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: CLIENT_URL, credentials: true } });
app.set('io', io);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint (always available, even when DB is connecting)
app.get('/api/health', (req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.json({ ok: true, db: connected ? 'connected' : 'disconnected' });
});

// Guard all other /api routes: return 503 if DB is not connected
app.use('/api', (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ msg: 'The database is not connected. Check MONGO_URI in server/.env.' });
  }
  next();
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/stories', require('./routes/stories'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/messages', require('./routes/messages'));

// Uniform JSON errors (no stack traces leaked)
app.use((err, req, res, next) => {
  if (err.name === 'MulterError' || err.message?.startsWith('Only images')) return res.status(400).json({ msg: err.code === 'LIMIT_FILE_SIZE' ? 'That file is too large (max 100 MB).' : err.message });
  if (err.name === 'CastError') return res.status(404).json({ msg: 'Not found.' });
  if (err.status) return res.status(err.status).json({ msg: err.message });
  console.error(err);
  res.status(500).json({ msg: 'Something went wrong on our side. Please try again.' });
});

// Realtime: JWT-authenticated sockets, personal rooms, online presence, typing
const online = new Map();
io.use((socket, next) => {
  try { socket.userId = jwt.verify(socket.handshake.auth.token, process.env.JWT_SECRET).id; next(); }
  catch { next(new Error('auth')); }
});
io.on('connection', (socket) => {
  socket.join('u:' + socket.userId);
  online.set(socket.userId, (online.get(socket.userId) || 0) + 1);
  io.emit('presence', { userId: socket.userId, online: true });
  socket.emit('online-users', [...online.keys()]);
  socket.on('typing', ({ to }) => to && io.to('u:' + to).emit('typing', { from: socket.userId }));
  socket.on('disconnect', () => {
    const c = (online.get(socket.userId) || 1) - 1;
    if (c <= 0) { online.delete(socket.userId); io.emit('presence', { userId: socket.userId, online: false }); }
    else online.set(socket.userId, c);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log('Server running on port ' + PORT));

if (!process.env.MONGO_URI) {
  console.error('\n[DATABASE CONFIG ERROR] MONGO_URI is missing in server/.env!\nPlease set MONGO_URI in server/.env.\n');
} else {
  mongoose
    .connect(process.env.MONGO_URI)
    .then(async () => {
      console.log('MongoDB connected');
      await verifyMail();
    })
    .catch((e) => {
      console.error('\n[DATABASE CONNECTION ERROR] Failed to connect to MongoDB:');
      console.error(e.message);
      console.error('Check MONGO_URI in server/.env.\n');
    });
}
