import mongoose from 'mongoose';

let wikiEntrySchema = mongoose.Schema({
  title: { type: String, required: true },
  videoID: { type: String, required: true, unique: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'WikiStructure', required: true },
  keywords: [{ type: String, required: true, unique: true, maxlength: 30 }],
});

export default mongoose.model('WikiEntry', wikiEntrySchema);
