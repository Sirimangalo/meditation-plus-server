import mongoose from 'mongoose';

let wikiCategorySchema = mongoose.Schema({
  name: { type: String, required: true, unique: true },
  parent: { type: mongoose.Schema.Types.ObjectId, default: null },
  videoCount: { type: Number, default: 0 }
});

export default mongoose.model('WikiCategory', wikiCategorySchema);
