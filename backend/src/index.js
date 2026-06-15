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
import Document from './models/Document.js';

const app = express();
const server = http.createServer(app);

// CORS — allow every origin, no exceptions
app.use(cors({ origin: true, credentials: true }));
app.options('*', cors({ origin: true, credentials: true }));
app.use(express.json());

// Health check / keep-alive endpoint for Render.com free-tier instances
app.get('/api/health', (_req, res) => res.json({ ok: true }));

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

// Socket.IO
const io = new SocketIOServer(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'OPTIONS'] }
});

const activeUsers = {}; // docId -> array of { socketId, _id, email, displayName }
const activeSavers = {}; // docId -> { socketId, username }

// Real-time collaboration namespace
io.use(authenticateSocket);
io.on('connection', (socket) => {
  // Simple room join; docId identifies collaborative session
  socket.on('join-document', async ({ docId, user: clientUser }) => {
    if (!docId) return;
    
    // Attach document context to the socket for cleanup on disconnect
    socket.docId = docId;
    socket.userData = clientUser || { _id: socket.user?._id, email: socket.user?.email, displayName: '' };
    
    socket.join(docId);
    
    if (!activeUsers[docId]) {
      activeUsers[docId] = [];
    }
    
    // Add socket connection if not already present
    if (!activeUsers[docId].some(u => u.socketId === socket.id)) {
      activeUsers[docId].push({
        socketId: socket.id,
        _id: socket.userData._id,
        email: socket.userData.email,
        displayName: socket.userData.displayName || socket.userData.email?.split('@')[0] || 'Anonymous'
      });
    }
    
    // Broadcast active users to everyone in the room
    io.to(docId).emit('active-users', activeUsers[docId]);
    
    // If there's an active saver, let the joining client know
    if (activeSavers[docId]) {
      socket.emit('save-locked', { username: activeSavers[docId].username });
    }
    
    try {
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

  // Handle start of commit/save operation
  socket.on('start-save', ({ username }) => {
    const docId = socket.docId;
    if (docId) {
      activeSavers[docId] = { socketId: socket.id, username };
      socket.to(docId).emit('save-locked', { username });
    }
  });

  // Handle end of commit/save operation
  socket.on('end-save', () => {
    const docId = socket.docId;
    if (docId && activeSavers[docId]?.socketId === socket.id) {
      delete activeSavers[docId];
      io.to(docId).emit('save-unlocked');
    }
  });

  socket.on('disconnect', () => {
    const docId = socket.docId;
    
    // Clear save lock if this socket held it
    if (docId && activeSavers[docId]?.socketId === socket.id) {
      delete activeSavers[docId];
      io.to(docId).emit('save-unlocked');
    }
    
    if (docId && activeUsers[docId]) {
      // Remove connection
      activeUsers[docId] = activeUsers[docId].filter(u => u.socketId !== socket.id);
      
      // Clean up room if empty, otherwise broadcast updated list
      if (activeUsers[docId].length === 0) {
        delete activeUsers[docId];
      } else {
        io.to(docId).emit('active-users', activeUsers[docId]);
      }
    }
  });
});

const port = process.env.PORT || 5000;
server.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});

// y-websocket is now a standalone server. This API server no longer mounts it.
