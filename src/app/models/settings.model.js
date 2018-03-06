import mongoose from 'mongoose';

let settingsSchema = mongoose.Schema({
  appointmentsTimezone: {
    type: String,
    default: 'America/Toronto'
  },
  livestreamInfo: String
});

export default mongoose.model('Settings', settingsSchema);
