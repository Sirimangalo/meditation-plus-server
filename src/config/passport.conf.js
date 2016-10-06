/**
 * This file contains the function which configures the PassportJS
 * instance passed in.
 */

import LocalStrategy from 'passport-local';
import User from '../app/models/user.model.js';
import md5 from 'md5';

export default (passport) => {
  // Define length boundaries for expected parameters
  let bounds = {
    password : {
      minLength : 8,
      maxLength : 128
    },
    email : {
      minLength : 5,
      maxLength : 256
    }
  };

  // Function to check a string against a REGEX for email validity
  let validateEmail = (email) => {
    let re = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
    return re.test(email);
  };

  // Helper function to validate string length
  let checkLength = (string, min, max) => {
    return !(string.length > max || string.length < min);
  };

  passport.serializeUser((user, done) => {
    done(null, {
      _id : user._id,
      role : user.role
    });
  });
  passport.deserializeUser((sessionUser, done) => {
    done(null, sessionUser);
  });

  passport.use('local-signup', new LocalStrategy({
    usernameField : 'email',
    passwordField : 'password',
    // Allow the entire request to be passed back to the callback
    passReqToCallback : true
  }, (req, email, password, done) => {
    // Data Checks

    // If the length of the email string is too long/short,
    // invoke verify callback
    if(!checkLength(email, bounds.email.minLength, bounds.email.maxLength)) {
      return done(null, false, { signupMessage : 'Invalid email length.' });
    }

    // If the length of the password string is too long/short,
    // invoke verify callback
    if(!checkLength(password, bounds.password.minLength, bounds.password.maxLength)) {
      return done(null, false, { signupMessage : 'Invalid password length.' });
    }

    // If the string is not a valid email...
    if(!validateEmail(email)) {
      return done(null, false, { signupMessage : 'Invalid email address.' });
    }

    // Asynchronous
    // User.findOne will not fire unless data is sent back
    process.nextTick(() => {

      // Find a user whose email or email is the same as the passed
      // in data
      User.findOne({
        'local.email' : email
      }, (err, user) => {
        if (err) return done(err);

        if (user) {
          // Email already taken.
          // Invoke `done` with `false` to indicate authentication failure
          return done(null, false, { signupMessage : 'That email is already taken.' });
        } else {
          // Create the user
          let newUser = new User();

          newUser.local.email = email.toLowerCase();
          newUser.name = req.body.name;
          newUser.local.password = newUser.generateHash(password);
          newUser.gravatarHash = md5(newUser.local.email);

          // Save the new user
          newUser.save(err => {
            if (err) throw err;
            return done(null, newUser);
          });
        }
      });
    });
  }));

  passport.use('local-login', new LocalStrategy({
    usernameField : 'email',
    passwordField : 'password',
    // Allow the entire request to be passed back to the callback
    passReqToCallback : true
  }, (req, email, password, done) => {

    // Data Checks
    if(!checkLength(email, bounds.email.minLength, bounds.email.maxLength)) {
      return done(null, false, { loginMessage : 'Invalid email length.' });
    }

    if(!checkLength(password, bounds.password.minLength, bounds.password.maxLength)) {
      return done(null, false, { loginMessage : 'Invalid password length.' });
    }

    User.findOne({
      'local.email' : email.toLowerCase()
    }, (err, user) => {
      if (err) return done(err);

      // If no user is found, return a message
      if (!user) {
        return done(
          null,
          false,
          { loginMessage : 'That user was not found. ' +
          'Please enter valid user credentials.' }
        );
      }

      // If the user is found but the password is incorrect
      if (!user.validPassword(password)) {
        return done(null, false, { loginMessage : 'Invalid password entered.' });
      }

      // Check account suspension
      if (user.suspendedUntil && user.suspendedUntil > new Date()) {
        return done(null, false, { loginMessage: 'This account is suspended.' });
      }

      // Otherwise all is well; return successful user

      // Generate hash for Gravatar if not present
      if (!user.gravatarHash) {
        user.gravatarHash = md5(user.local.email);

        // Save the new user
        user.save(err => {
          if (err) throw err;
          return done(null, user);
        });
      } else {
        return done(null, user);
      }
    });
  }));
};
