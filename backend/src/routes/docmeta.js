import express from 'express';
import Document from '../models/Document.js';
import { optionalAuth } from '../middleware/optionalAuth.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/:id/capability', optionalAuth, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id)
      .select('ownerId collaboratorIds isPrivate title updatedAt')
      .populate('ownerId', '_id displayName email')
      .populate('collaboratorIds', '_id displayName email');
    if (!doc) return res.status(404).json({ error: 'Not found' });
    const uid = req.user?._id?.toString();
    const isOwner = uid && doc.ownerId?._id?.toString() === uid;
    const isCollaborator = uid && doc.collaboratorIds?.some(id => id._id?.toString() === uid);
    
    if (doc.isPrivate && !isOwner && !isCollaborator) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.json({
      _id: doc._id,
      title: doc.title,
      isPrivate: !!doc.isPrivate,
      canEdit: !!(isOwner || isCollaborator),
      updatedAt: doc.updatedAt,
      owner: doc.ownerId ? { _id: doc.ownerId._id, displayName: doc.ownerId.displayName, email: doc.ownerId.email } : null,
      collaborators: (doc.collaboratorIds || []).map(c => ({ _id: c._id, displayName: c.displayName, email: c.email })),
    });
  } catch (err) {
    console.error('Capability check error:', err);
    return res.status(500).json({ error: 'Failed to check capability' });
  }
});

router.get('/:id/content', optionalAuth, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id).select('content isPrivate ownerId collaboratorIds');
    if (!doc) return res.status(404).json({ error: 'Not found' });
    const uid = req.user?._id?.toString();
    const canView = !doc.isPrivate || (uid && (doc.ownerId?.toString() === uid || doc.collaboratorIds?.some(id => id.toString() === uid)));
    if (!canView) return res.status(403).json({ error: 'Forbidden' });
    res.json({ content: doc.content || '' });
  } catch (err) {
    console.error('Content fetch error:', err);
    return res.status(500).json({ error: 'Failed to fetch content' });
  }
});

router.post('/:id/content', requireAuth, async (req, res) => {
  try {
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
  } catch (err) {
    console.error('Content update error:', err);
    return res.status(500).json({ error: 'Failed to update content' });
  }
});

export default router;
