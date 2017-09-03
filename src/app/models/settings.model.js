import mongoose from 'mongoose';

let settingsSchema = mongoose.Schema({
  appointmentsIncrement: {
    type: Number,
    default: 0
  },
  appointmentsTimezone: {
    type: String,
    default: 'America/Toronto'
  }
});

export default mongoose.model('Settings', settingsSchema);
