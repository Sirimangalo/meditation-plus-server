import mongoose from 'mongoose';

let schema = mongoose.Schema({
  started: Date,
  ended: Date,
  videoUrl: String
}, {
  timestamps: true
});

export default mongoose.model('Broadcast', schema);
