import mongoose from 'mongoose';

let questionSchema = mongoose.Schema({
  text : { type: String, required: true, maxlength: 1000 },
  user : { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  broadcast : { type: mongoose.Schema.Types.ObjectId, ref: 'Broadcast' },
  answered: { type: Boolean, default: false, required: true },
  answeringAt: Date,
  answeredAt: Date,
  videoUrl: String,
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  numOfLikes: Number
}, {
  timestamps: true
});

export default mongoose.model('Question', questionSchema);
