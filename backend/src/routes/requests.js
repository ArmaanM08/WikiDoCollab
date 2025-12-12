import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import Document from '../models/Document.js';
import User from '../models/User.js';

const router = express.Router();
router.use(requireAuth);

// List pending collaboration requests for documents owned by current user
router.get('/', async (req, res) => {
  const ownerId = req.user._id;
  const docs = await Document.find({ ownerId }).select('_id title collaborationRequests');
  const entries = [];
  const userIds = new Set();
  for (const d of docs) {
    for (const r of (d.collaborationRequests || [])) {
      if (r.status === 'pending' && r.userId) {
        entries.push({ docId: d._id.toString(), title: d.title, userId: r.userId.toString(), requestedAt: r.requestedAt });
        userIds.add(r.userId.toString());
      }
    }
  }
  const users = await User.find({ _id: { $in: Array.from(userIds) } }).select('_id email displayName');
  const map = new Map(users.map(u => [u._id.toString(), u]));
  const result = entries.map(e => ({
    docId: e.docId,
    title: e.title,
    requester: {
      _id: e.userId,
      email: map.get(e.userId)?.email || '',
      displayName: map.get(e.userId)?.displayName || '',
    },
    requestedAt: e.requestedAt,
  }));
  res.json(result);
});

export default router;
