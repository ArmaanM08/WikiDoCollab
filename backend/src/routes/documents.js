import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import Document from '../models/Document.js';
import Version from '../models/Version.js';
import User from '../models/User.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const docs = await Document.find({ $or: [ { ownerId: req.user._id }, { collaboratorIds: req.user._id } ] })
      .select('title isPrivate ownerId collaboratorIds thumbnail createdAt updatedAt')
      .sort({ updatedAt: -1 });
    res.json(docs);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { title, isPrivate = false } = req.body;
    const doc = await Document.create({ title, isPrivate, ownerId: req.user._id });
    res.json(doc);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create document' });
  }
});

router.get('/:id/versions', async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id).select('ownerId collaboratorIds isPrivate');
    if (!doc) return res.status(404).json({ error: 'Not found' });
    const uid = req.user._id.toString();
    const hasAccess = !doc.isPrivate || (doc.ownerId.toString() === uid || doc.collaboratorIds.some(id => id.toString() === uid));
    if (!hasAccess) return res.status(403).json({ error: 'Forbidden' });

    const versions = await Version.find({ documentId: req.params.id })
      .populate('authorId', 'displayName email')
      .sort({ createdAt: -1 });
    res.json(versions);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch versions' });
  }
});

router.post('/:id/versions', async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id).select('ownerId collaboratorIds');
    if (!doc) return res.status(404).json({ error: 'Not found' });
    const uid = req.user._id.toString();
    const canEdit = doc.ownerId.toString() === uid || doc.collaboratorIds.some(id => id.toString() === uid);
    if (!canEdit) return res.status(403).json({ error: 'Forbidden' });

    const { message, snapshot } = req.body;
    const snapBuf = snapshot ? Buffer.from(snapshot, 'base64') : undefined;
    const version = await Version.create({ documentId: req.params.id, authorId: req.user._id, message, snapshot: snapBuf });
    res.json(version);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to save version' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const doc = await Document.findById(id).select('ownerId');
    if (!doc) return res.status(404).json({ error: 'Not found' });
    if (doc.ownerId.toString() !== req.user._id.toString()) return res.status(403).json({ error: 'Only owner can delete' });
    await Version.deleteMany({ documentId: id });
    await Document.deleteOne({ _id: id });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete document' });
  }
});

router.post('/:id/request-access', async (req, res) => {
  try {
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
  } catch (err) {
    return res.status(500).json({ error: 'Failed to request access' });
  }
});

router.post('/:id/approve', async (req, res) => {
  try {
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
  } catch (err) {
    return res.status(500).json({ error: 'Failed to process request' });
  }
});

router.post('/:id/invite', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    
    // Only the owner can invite collaborators
    if (doc.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only the document owner can invite collaborators' });
    }
    
    // Find the user to invite
    const inviteeEmail = String(email).trim().toLowerCase();
    const invitee = await User.findOne({ email: inviteeEmail });
    if (!invitee) {
      return res.status(404).json({ error: 'User with this email was not found. They must register first.' });
    }
    
    const inviteeIdStr = invitee._id.toString();
    
    // Cannot invite yourself (the owner)
    if (inviteeIdStr === req.user._id.toString()) {
      return res.status(400).json({ error: 'You are the owner of this document.' });
    }
    
    // Check if already a collaborator
    const isAlreadyCollab = (doc.collaboratorIds || []).some(id => id.toString() === inviteeIdStr);
    if (isAlreadyCollab) {
      return res.status(400).json({ error: 'User is already a collaborator.' });
    }
    
    // Grant access
    doc.collaboratorIds = doc.collaboratorIds || [];
    doc.collaboratorIds.push(invitee._id);
    
    // If they have a pending request, auto-approve it
    const reqIndex = (doc.collaborationRequests || []).findIndex(
      r => r.userId?.toString() === inviteeIdStr && r.status === 'pending'
    );
    if (reqIndex !== -1) {
      doc.collaborationRequests[reqIndex].status = 'approved';
    }
    
    await doc.save();
    
    return res.json({
      success: true,
      message: 'Collaborator added successfully!',
      collaborator: {
        _id: invitee._id,
        displayName: invitee.displayName,
        email: invitee.email
      }
    });
  } catch (err) {
    console.error('Invite collaborator error:', err);
    return res.status(500).json({ error: 'Failed to invite collaborator' });
  }
});

export default router;
