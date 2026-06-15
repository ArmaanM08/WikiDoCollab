import express from 'express';
import Document from '../models/Document.js';
import { optionalAuth } from '../middleware/optionalAuth.js';

const router = express.Router();

router.get('/documents', optionalAuth, async (req, res) => {
  try {
    const query = req.user
      ? {
          $or: [
            { isPrivate: { $ne: true } },
            { ownerId: req.user._id },
            { collaboratorIds: req.user._id }
          ]
        }
      : { isPrivate: { $ne: true } };

    const docs = await Document.find(query)
      .select('title isPrivate ownerId collaboratorIds thumbnail updatedAt')
      .sort({ updatedAt: -1 })
      .populate('ownerId', 'email displayName')
      .populate('collaboratorIds', 'email displayName');
    const mapped = docs.map(d => ({
      _id: d._id,
      title: d.title,
      isPrivate: d.isPrivate,
      owner: d.ownerId ? { id: d.ownerId._id, name: d.ownerId.displayName || d.ownerId.email } : null,
      collaborators: (d.collaboratorIds || []).map(c => ({ id: c._id, name: c.displayName || c.email })),
      thumbnail: d.thumbnail,
      updatedAt: d.updatedAt,
    }));
    res.json(mapped);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

export default router;
