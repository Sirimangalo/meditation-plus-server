import mongoose from 'mongoose';

let wikiSchema = mongoose.Schema({
  title: { type: String, required: true },
  videoID: { type: String, required: true, unique: true },
  category: { type: String, required: true, maxlength: 50 },
  tags: [{ type: String, required: true, unique: true, maxlength: 30 }],
});

export default mongoose.model('Wiki', wikiSchema);
