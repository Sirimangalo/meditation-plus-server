import mongoose from 'mongoose';

let settingsSchema = mongoose.Schema({
  appointmentsIncrement: {
    type: Number,
    default: 0
  },
  appointmentsTicker: [{
    type: String,
    default: []
  }]
});

export default mongoose.model('Settings', settingsSchema);
