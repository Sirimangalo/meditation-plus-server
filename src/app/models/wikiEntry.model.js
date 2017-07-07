import mongoose from 'mongoose';

let wikiEntrySchema = mongoose.Schema({
  title: { type: String, required: true },
  url: { type: String, required: true },
  startAt: { type: Number, default: 0 },
  publishedAt: Date,
  description: String,
  tags: [{ type: String, ref: 'WikiTag' }]
}, {
  timestamps: true
});

// add text index for full text search on the description field
wikiEntrySchema.index({
  title: 'text',
  description: 'text'
});

export default mongoose.model('WikiEntry', wikiEntrySchema);
