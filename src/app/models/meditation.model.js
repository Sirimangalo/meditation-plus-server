import mongoose from 'mongoose';

let meditationSchema = mongoose.Schema({
  walking: Number,
  sitting: Number,
  numOfLikes: Number,
  end: Date,
  user: {
    type : mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Validate presence of either "walking" or "sitting"
meditationSchema.pre('validate', function(next) {
  if (!this.walking && !this.sitting) {
    next(new Error('Either walking time or sitting time has to be set.'));
  } {
    next();
  }
});

export default mongoose.model('Meditation', meditationSchema);
