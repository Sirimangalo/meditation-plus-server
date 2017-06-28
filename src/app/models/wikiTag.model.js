import mongoose from 'mongoose';

let wikiTagSchema = mongoose.Schema({
  _id: { type: String, unique: true, required: true },
  related: [{ ref: WikiTag }]
}, {
  timestamps: true
});

export default mongoose.model('WikiEntry', wikiEntrySchema);
