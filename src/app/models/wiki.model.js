import mongoose from 'mongoose';

let wikiSchema = mongoose.Schema({
  title: { type: String, required: true },
  url: { type: String, required: true },
  category: { type: String, required: true },
  tags: { type: String[], required: true },
});

export default mongoose.model('Wiki', wikiSchema);
