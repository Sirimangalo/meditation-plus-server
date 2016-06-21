// */app/models/message.model.js*

// ## User Model

// Note: MongoDB will autogenerate an _id for each User object created

// Grab the Mongoose module
import mongoose from 'mongoose';

// Define the schema for the showcase item
let meditationSchema = mongoose.Schema({
  walking: Number,
  sitting: Number,
  end: Date,
  user: {
    type : mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
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