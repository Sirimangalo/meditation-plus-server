// */app/models/user.model.js*

// ## User Model

// Note: MongoDB will autogenerate an _id for each User object created

// Grab the Mongoose module
import mongoose from 'mongoose';

// Import library to hash passwords
import bcrypt from 'bcrypt-nodejs';

// Define the schema for the showcase item
let userSchema = mongoose.Schema({

  local : {
    password : String,
    email : { type : String, unique : true }
  },
  name: { type: String, maxlength: 30 },
  role : { type : String },
  showEmail: Boolean,
  noTabs: Boolean,
  description: { type: String, maxlength: 300 },
  website: { type: String, maxlength: 100 },
  country: String,
  sound: String,
  gravatarHash: String
});

// ## Methods

// ### Generate a hash
userSchema.methods.generateHash = function(password) {

  return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

// ### Check if password is valid
userSchema.methods.validPassword = function(password) {

  return bcrypt.compareSync(password, this.local.password);
};

// Create the model for users and expose it to the app
export default mongoose.model('User', userSchema);