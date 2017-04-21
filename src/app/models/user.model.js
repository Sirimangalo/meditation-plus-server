import mongoose from 'mongoose';
import bcrypt from 'bcrypt-nodejs';

let userSchema = mongoose.Schema({

  local : {
    password : String,
    email : { type : String, unique : true }
  },
  suspendedUntil: Date,
  name: { type: String, maxlength: 30 },
  role : { type : String },
  showEmail: Boolean,
  hideStats: Boolean,
  description: { type: String, maxlength: 300 },
  website: { type: String, maxlength: 100 },
  country: String,
  lastActive: Date,
  lastMeditation: Date,
  lastLike: Date,
  sound: { type: String, default: '/assets/audio/bell1.mp3' },
  stableBell: { type: Boolean, default: false },
  gravatarHash: String,
  timezone: String,
  verified: { type: Boolean, default: false },
  verifyToken: String,
  recoverUntil: Date
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
