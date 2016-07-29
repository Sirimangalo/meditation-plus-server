// */app/models/message.model.js*

// ## User Model

// Note: MongoDB will autogenerate an _id for each User object created

// Grab the Mongoose module
import mongoose from 'mongoose';

// Define the schema for the showcase item
let testimonialSchema = mongoose.Schema({
  text : { type: String, required: true },
  user : { type : mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  reviewed: { type : Boolean, required: true }
}, {
    timestamps: true
});

export default mongoose.model('Testimonial', testimonialSchema);