import mongoose from 'mongoose';

let commitmentSchema = mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['daily', 'weekly']
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
