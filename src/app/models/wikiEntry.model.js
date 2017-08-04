import mongoose from 'mongoose';

let wikiEntrySchema = mongoose.Schema({
  title: { type: String, required: true },
  videoId: { type: String, required: true },
  startAt: { type: Number, default: 0 },
  publishedAt: Date,
  description: String,
  tags: [{ type: String, ref: 'WikiTag' }],
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, {
  timestamps: true
});

// add text index for full text search on the description field
wikiEntrySchema.index({
  title: 'text',
  description: 'text',
  tags: 'text'
}, {
  // searching for title and description should be the preferred
  // fields. Those results will be higher ranked by increasing
  // their weights.
  weights: {
    title: 4,
    description: 4,
    tags: 1
  }
});

export default mongoose.model('WikiEntry', wikiEntrySchema);
