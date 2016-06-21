import mongoose from 'mongoose';

let appointmentSchema = mongoose.Schema({
  hour: Number,
  weekDay: Number,
  user: {
    type : mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
}, {
    timestamps: true
});

export default mongoose.model('Appointment', appointmentSchema);