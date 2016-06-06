import mongoose from 'mongoose';

let commitmentSchema = mongoose.Schema({
  type: String, // daily, weekly, (monthly)
  minutes: Number,
  users: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
    timestamps: true
});

export default mongoose.model('Commitment', commitmentSchema);