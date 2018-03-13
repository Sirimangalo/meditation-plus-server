import mongoose from 'mongoose';

let MeetingSchema = mongoose.Schema({
  participants: [{ type : mongoose.Schema.Types.ObjectId, ref: 'User' }],
  messages: [{ type : mongoose.Schema.Types.ObjectId, ref: 'Message' }],
  closedAt: Date
}, {
  timestamps: true
});

export default mongoose.model('Meeting', MeetingSchema);
