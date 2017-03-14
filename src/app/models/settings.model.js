import mongoose from 'mongoose';

let settingsSchema = mongoose.Schema({
  appointmentIncrement: { type: Number, default: 0 }
});

export default mongoose.model('Settings', settingsSchema);
