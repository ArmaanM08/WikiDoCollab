import mongoose from 'mongoose';

const versionSchema = new mongoose.Schema({
  documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  message: { type: String },
  snapshot: { type: Buffer },
}, { timestamps: true });

export default mongoose.model('Version', versionSchema);
