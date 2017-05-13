import mongoose from 'mongoose';

let pushSubscriptionsSchema = mongoose.Schema({
  username : { type: String, required: true },
  endpoint: { type: String, unique: true },
  subscription: { type: String, required: true, unique: true }
}, {
  timestamps: true
});

export default mongoose.model('PushSubscriptions', pushSubscriptionsSchema);
