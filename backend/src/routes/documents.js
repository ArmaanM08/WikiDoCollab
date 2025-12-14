import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import Document from '../models/Document.js';
import Version from '../models/Version.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  const docs = await Document.find({ $or: [ { ownerId: req.user._id }, { collaboratorIds: req.user._id } ] }).sort({ updatedAt: -1 });
  res.json(docs);
});

router.post('/', async (req, res) => {
  const { title, isPrivate = false } = req.body;
  const doc = await Document.create({ title, isPrivate, ownerId: req.user._id });
  res.json(doc);
});

router.get('/:id/versions', async (req, res) => {
  const versions = await Version.find({ documentId: req.params.id })
    .populate('authorId', 'displayName email')
    .sort({ createdAt: -1 });
  res.json(versions);
});

router.post('/:id/versions', async (req, res) => {
  const { message, snapshot } = req.body; // snapshot should be base64
  const snapBuf = snapshot ? Buffer.from(snapshot, 'base64') : undefined;
  const version = await Version.create({ documentId: req.params.id, authorId: req.user._id, message, snapshot: snapBuf });
  res.json(version);
});

// Delete a document (owner only). Also deletes its versions.
router.delete('/:id', async (req, res) => {
  const id = req.params.id;
  const doc = await Document.findById(id).select('ownerId');
  if (!doc) return res.status(404).json({ error: 'Not found' });
  if (doc.ownerId.toString() !== req.user._id.toString()) return res.status(403).json({ error: 'Only owner can delete' });
  await Version.deleteMany({ documentId: id });
  await Document.deleteOne({ _id: id });
  return res.json({ ok: true });
});

// Request to collaborate on a document
router.post('/:id/request-access', async (req, res) => {
  const doc = await Document.findById(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  const uid = req.user._id.toString();
  if (doc.ownerId.toString() === uid) return res.status(400).json({ error: 'Owner already has access' });
  const alreadyCollab = (doc.collaboratorIds || []).some(id => id.toString() === uid);
  if (alreadyCollab) return res.status(200).json({ status: 'already-collaborator' });
  const existingReq = (doc.collaborationRequests || []).find(r => r.userId?.toString() === uid && r.status === 'pending');
  if (existingReq) return res.status(200).json({ status: 'already-requested' });
  doc.collaborationRequests = doc.collaborationRequests || [];
  doc.collaborationRequests.push({ userId: req.user._id, status: 'pending' });
  await doc.save();
  res.json({ status: 'requested' });
});

// Approve or reject collaboration request (owner only)
router.post('/:id/approve', async (req, res) => {
  const { userId, approve } = req.body;
  const doc = await Document.findById(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  if (doc.ownerId.toString() !== req.user._id.toString()) return res.status(403).json({ error: 'Only owner can approve' });
  const reqIndex = (doc.collaborationRequests || []).findIndex(r => r.userId?.toString() === userId && r.status === 'pending');
  if (reqIndex === -1) return res.status(400).json({ error: 'No pending request' });
  doc.collaborationRequests[reqIndex].status = approve ? 'approved' : 'rejected';
  if (approve) {
    const already = (doc.collaboratorIds || []).some(id => id.toString() === userId);
    if (!already) doc.collaboratorIds.push(userId);
  }
  await doc.save();
  res.json({ status: approve ? 'approved' : 'rejected' });
});

export default router;
