import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  collaboratorIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  permissions: { type: Map, of: String, default: {} },
  isPrivate: { type: Boolean, default: false },
  collaborationRequests: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    requestedAt: { type: Date, default: Date.now }
  }],
  content: { type: String, default: '' },
  snapshot: { type: Buffer },
}, { timestamps: true });

export default mongoose.model('Document', documentSchema);
