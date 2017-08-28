import mongoose from 'mongoose';

let settingsSchema = mongoose.Schema({
  appointmentsIncrement: { type: Number, default: 0 },
  appointmentsTimezone: { type: String, default: 'Eastern Standard Time' }
});

export default mongoose.model('Settings', settingsSchema);
