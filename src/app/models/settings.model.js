import mongoose from 'mongoose';

let settingsSchema = mongoose.Schema({
  appointmentsIncrement: {
    type: Number,
    default: 0
  },
  appointmentTicker: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PushSubscriptions',
    default: []
  }]
});

export default mongoose.model('Settings', settingsSchema);
