import express from 'express';
import Document from '../models/Document.js';
import { optionalAuth } from '../middleware/optionalAuth.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Capability check: can user edit this document?
router.get('/:id/capability', optionalAuth, async (req, res) => {
  const doc = await Document.findById(req.params.id).select('ownerId collaboratorIds isPrivate title updatedAt');
  if (!doc) return res.status(404).json({ error: 'Not found' });
  const uid = req.user?._id?.toString();
  const isOwner = uid && doc.ownerId?.toString() === uid;
  const isCollaborator = uid && doc.collaboratorIds?.some(id => id.toString() === uid);
  
  if (doc.isPrivate && !isOwner && !isCollaborator) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  res.json({
    _id: doc._id,
    title: doc.title,
    isPrivate: !!doc.isPrivate,
    canEdit: !!(isOwner || isCollaborator),
    updatedAt: doc.updatedAt,
  });
});

export default router;

// Public-readable content (if not private). If private, only owner/collab can read.
router.get('/:id/content', optionalAuth, async (req, res) => {
  const doc = await Document.findById(req.params.id).select('content isPrivate ownerId collaboratorIds');
  if (!doc) return res.status(404).json({ error: 'Not found' });
  const uid = req.user?._id?.toString();
  const canView = !doc.isPrivate || (uid && (doc.ownerId?.toString() === uid || doc.collaboratorIds?.some(id => id.toString() === uid)));
  if (!canView) return res.status(403).json({ error: 'Forbidden' });
  res.json({ content: doc.content || '' });
});

// Update content & thumbnail (owner/collaborator only)
router.post('/:id/content', requireAuth, async (req, res) => {
  const doc = await Document.findById(req.params.id).select('ownerId collaboratorIds');
  if (!doc) return res.status(404).json({ error: 'Not found' });
  const uid = req.user?._id?.toString();
  const canEdit = uid && (doc.ownerId?.toString() === uid || doc.collaboratorIds?.some(id => id.toString() === uid));
  if (!canEdit) return res.status(403).json({ error: 'Forbidden' });
  
  const { content, thumbnail } = req.body;
  const updateFields = {};
  if (content !== undefined) updateFields.content = String(content);
  if (thumbnail !== undefined) updateFields.thumbnail = String(thumbnail);
  
  await Document.updateOne({ _id: req.params.id }, { $set: updateFields });
  res.json({ ok: true });
});
