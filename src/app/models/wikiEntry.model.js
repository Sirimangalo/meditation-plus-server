import mongoose from 'mongoose';

let wikiEntrySchema = mongoose.Schema({
  url: { type: String, required: true },
  startAt: { type: Number, default: 0 },
  description: String,
  tags: [{ type: String, ref: 'WikiTag' }]
}, {
  timestamps: true
});

export default mongoose.model('WikiEntry', wikiEntrySchema);
