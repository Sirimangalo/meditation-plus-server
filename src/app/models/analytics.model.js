import mongoose from 'mongoose';

let analyticsSchema = mongoose.Schema({
  users: Number,
  inactiveUsers: Number,
  suspendedUsers: Number,
  meditationTime: Number,
  chatMessages: Number
}, {
  timestamps: true
});

export default mongoose.model('Analytics', analyticsSchema);
