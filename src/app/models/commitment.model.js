import mongoose from 'mongoose';

let commitmentSchema = mongoose.Schema({
  type: { // daily, weekly, (monthly)
    type: String,
    required: true
  },
  minutes: { type: Number, required: true },
  users: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

export default mongoose.model('Commitment', commitmentSchema);
