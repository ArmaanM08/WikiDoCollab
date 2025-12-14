import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import mongoose from 'mongoose';
import { Server as SocketIOServer } from 'socket.io';
// jwt import removed from index; socketAuth handles authentication

import authRouter from './routes/auth.js';
import docRouter from './routes/documents.js';
import publicRouter from './routes/public.js';
import docMetaRouter from './routes/docmeta.js';
// import exportRouter from './routes/exports.js';
import { authenticateSocket } from './middleware/socketAuth.js';
import requestsRouter from './routes/requests.js';

const app = express();
const server = http.createServer(app);
// Allow local dev and Vercel deployments
const allowedOrigins = [
  'http://localhost:5173',
  'https://my-project-git-main-armaan-mulanis-projects.vercel.app',
  'https://my-project-wikidocollab.vercel.app'
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

const io = new SocketIOServer(server, { cors: { ...corsOptions } });

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());

// REST routes
app.use('/api/auth', authRouter);
app.use('/api/documents', docRouter);
app.use('/api/public', publicRouter);
app.use('/api/documents', docMetaRouter);
// Temporarily disable export routes to avoid puppeteer-core errors on Render
// app.use('/api/documents', exportRouter);
app.use('/api/requests', requestsRouter);

// Mongo connection
const mongoUri = process.env.MONGODB_URI;
mongoose.connect(mongoUri).then(() => {
  console.log('MongoDB connected');
}).catch(err => {
  console.error('MongoDB connection error', err);
});

// Real-time collaboration namespace
io.use(authenticateSocket);
io.on('connection', (socket) => {
  // Simple room join; docId identifies collaborative session
  socket.on('join-document', async ({ docId }) => {
    if (!docId) return;
    socket.join(docId);
    socket.to(docId).emit('presence', { userId: socket.user?._id, joined: true });
    try {
      const { default: Document } = await import('./models/Document.js');
      const doc = await Document.findById(docId).select('content isPrivate ownerId collaboratorIds');
      // Send current content to the joining client (read-only clients can still view if not private)
      const uid = socket.user?._id?.toString();
      const canView = !doc?.isPrivate || (uid && (doc?.ownerId?.toString() === uid || doc?.collaboratorIds?.some(id => id.toString() === uid)));
      if (doc && canView) socket.emit('doc-content', { content: doc.content || '' });
    } catch {}
  });

  // Broadcast keystroke/ops only if user has edit permission
  socket.on('doc-ops', async ({ docId, content }) => {
    if (!docId || typeof content !== 'string') return;
    try {
      const { default: Document } = await import('./models/Document.js');
      const doc = await Document.findById(docId).select('ownerId collaboratorIds');
      const uid = socket.user?._id?.toString();
      const canEdit = uid && (doc?.ownerId?.toString() === uid || doc?.collaboratorIds?.some(id => id.toString() === uid));
      if (!canEdit) return; // ignore edits from unauthorized users
      // Update content and broadcast to others
      await Document.updateOne({ _id: docId }, { $set: { content } });
      socket.to(docId).emit('doc-content', { content });
    } catch {
      // ignore on error
    }
  });

  socket.on('disconnect', () => {
    // minimal presence signal
  });
});

const port = process.env.PORT || 5000;
server.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});

// y-websocket is now a standalone server. This API server no longer mounts it.
