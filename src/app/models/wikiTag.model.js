import mongoose from 'mongoose';

let wikiTagSchema = mongoose.Schema({
  _id: { type: String, unique: true, required: true },
  entries: [{ type: mongoose.Schema.Types.ObjectId, ref: WikiEntry }],
  related: [{ type: String, ref: WikiTag }]
}, {
  timestamps: true
});

export default mongoose.model('WikiEntry', wikiEntrySchema);
