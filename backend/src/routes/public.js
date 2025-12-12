import express from 'express';
import Document from '../models/Document.js';
import { optionalAuth } from '../middleware/optionalAuth.js';

const router = express.Router();

// Public listing: show non-private documents with owner and collaborators meta
router.get('/documents', optionalAuth, async (req, res) => {
  const docs = await Document.find({ isPrivate: { $ne: true } })
    .sort({ updatedAt: -1 })
    .populate('ownerId', 'email displayName')
    .populate('collaboratorIds', 'email displayName');
  const mapped = docs.map(d => ({
    _id: d._id,
    title: d.title,
    isPrivate: d.isPrivate,
    owner: d.ownerId ? { id: d.ownerId._id, name: d.ownerId.displayName || d.ownerId.email } : null,
    collaborators: (d.collaboratorIds || []).map(c => ({ id: c._id, name: c.displayName || c.email })),
    updatedAt: d.updatedAt,
  }));
  res.json(mapped);
});

export default router;
