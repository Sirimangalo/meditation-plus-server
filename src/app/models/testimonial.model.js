import mongoose from 'mongoose';

let testimonialSchema = mongoose.Schema({
  text : { type: String, required: true },
  user : { type : mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  reviewed: { type : Boolean, required: true },
  anonymous: { type : Boolean, required: false }
}, {
  timestamps: true
});

export default mongoose.model('Testimonial', testimonialSchema);
