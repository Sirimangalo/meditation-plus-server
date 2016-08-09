// */app/models/message.model.js*

// ## User Model

// Note: MongoDB will autogenerate an _id for each User object created

// Grab the Mongoose module
import mongoose from 'mongoose';

// Define the schema for the showcase item
let messageSchema = mongoose.Schema({
  text : { type: String, required: true, maxlength: 1000 },
  user : { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  answered: { type : Boolean, required: false }
}, {
    timestamps: true
});

export default mongoose.model('Message', messageSchema);