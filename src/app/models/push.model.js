import mongoose from 'mongoose';

let pushSubscriptionsSchema = mongoose.Schema({
  user : { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  endpoint: { type: String, unique: true },
  p256dh: String,
  auth: String
}, {
  timestamps: true
});

export default mongoose.model('PushSubscriptions', pushSubscriptionsSchema);
