import mongoose from 'mongoose';

let questionSchema = mongoose.Schema({
  text : { type: String, required: true, maxlength: 1000 },
  user : { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  answered: Boolean,
  answeredAt: Date,
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  numOfLikes: Number
}, {
    timestamps: true
});

export default mongoose.model('Question', questionSchema);