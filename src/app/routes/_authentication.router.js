import User from '../models/user.model.js';
import jwt from 'jsonwebtoken';
import expressJwt from 'express-jwt';
import mail from '../helper/mail.js';
import randomstring from 'randomstring';

let ObjectId = require('mongoose').Types.ObjectId;

export default (app, router, passport, admin) => {

  /**
   * @api {post} /auth/login Login
   * @apiName Login
   * @apiGroup Auth
   *
   * @apiParam {String} email Email
   * @apiParam {String} password Password
   *
   * @apiSuccess {String} token Jwt
   * @apiSuccess {String} id    User id
   */
  router.post('/auth/login', (req, res, next) => {
    // Call `authenticate()` from within the route handler, rather than
    // as a route middleware. This gives the callback access to the `req`
    // and `res` object through closure.

    // If authentication fails, `user` will be set to `false`. If an
    // exception occured, `err` will be set. `info` contains a message
    // set within the Local Passport strategy.
    passport.authenticate('local-login', (err, user, info) => {

      if (err) {
        return next(err);
      }

      // If no user is returned...
      if (!user) {

        // Set HTTP status code `401 Unauthorized`
        res.status(401);
        res.send(info.loginMessage);

        return next();
      }

      // Use login function exposed by Passport to establish a login
      // session
      req.login(user, (err) => {

        if (err) {
          return next(err);
        }

        // Set HTTP status code `200 OK`
        res.status(200);

        let token = jwt.sign(req.user, process.env.SESSION_SECRET, {
          expiresIn: '7d'
        });

        // Return the token
        res.json({
          token,
          id: user._id,
          role: user.role ? user.role : 'ROLE_USER'
        });
      });

    }) (req, res, next);
  });

  /**
   * @api {post} /auth/refresh Refresh current JWT
   * @apiName RefreshToken
   * @apiGroup Auth
   */
  router.post(
    '/auth/refresh',
    expressJwt({ secret: process.env.SESSION_SECRET }),
    (req, res) => {
      if (!req.user) {
        return res.sendStatus(401);
      }

      res.status(200);

      delete req.user.exp;

      let token = jwt.sign(req.user, process.env.SESSION_SECRET, {
        expiresIn: '7d'
      });

      // Return the new token
      res.json({
        token,
        id: req.user._doc._id,
        role: req.user.role ? req.user.role : 'ROLE_USER'
      });
    }
  );

  /**
   * @api {post} /auth/signup Register a new account
   * @apiName SignUp
   * @apiGroup Auth
   *
   * @apiParam {String} email Email
   * @apiParam {String} password Password
   */
  router.post('/auth/signup', (req, res, next) => {

    // Call `authenticate()` from within the route handler, rather than
    // as a route middleware. This gives the callback access to the `req`
    // and `res` object through closure.

    // If authentication fails, `user` will be set to `false`. If an
    // exception occured, `err` will be set. `info` contains a message
    // set within the Local Passport strategy.
    passport.authenticate('local-signup', (err, user, info) => {

      if (err)
        return next(err);

      // If no user is returned...
      if (!user) {

        // Set HTTP status code `401 Unauthorized`
        res.status(401);
        res.send(info.signupMessage);

        // Return the info message
        return next();
      }

      // Send activation email
      mail.sendActivationEmail(user, (err) => {
        if (err) {
          // Mail delivery failed
          res.status(204).send('Error: Could not send verification email. Please try again or contact support.');
        } else {
          // Set HTTP status code `204 No Content`
          res.sendStatus(204);
        }
      });

    }) (req, res, next);
  });

  /**
   * @api {post} /auth/verify Verify the account of a new user by checking the secret email token
   * @apiName Verify
   * @apiGroup Auth
   *
   * @apiParam {String} token Verification token the user got via email
   */
  router.post('/auth/verify', async (req, res) => {
    try {
      const token = req.body.token ? req.body.token : null;

      if (!token) {
        return res.sendStatus(400);
      }

      const user = await User.findOne({
        verifyToken: token
      });

      if (!user) {
        res.sendStatus(400);
      }

      user.verified = true;

      await user.save();

      res.sendStatus(200);
    } catch (err) {
      res.status(500).send(err);
    }
  });

  /**
   * @api {post} /auth/resend Resend verification email
   * @apiName Resend
   * @apiGroup Auth
   *
   * @apiParam {String} email email address
   */
  router.post('/auth/resend', async (req, res) => {
    try {
      const email = req.body.email ? req.body.email : null;

      if (!email) {
        return res.sendStatus(400);
      }

      const user = await User.findOne({
        'local.email': email
      });

      if (!user || user.verified || !user.verifyToken) {
        return res.sendStatus(400);
      }

      // Send activation email
      mail.sendActivationEmail(user, (err) => {
        if (err) {
          // Mail delivery failed
          res.status(500).send(err);
        } else {
          // Set HTTP status code `204 No Content`
          res.sendStatus(204);
        }
      });
    } catch (err) {
      res.status(500).send(err);
    }
  });

  /**
   * @api {post} /auth/reset-init Send the user a mail for password recovery
   * @apiName Recover
   * @apiGroup Auth
   *
   * @apiParam {String} email email address
   */
  router.post('/auth/reset-init', async (req, res) => {
    try {
      const email = req.body.email ? req.body.email : null;

      if (!email) {
        return res.status(400).send('Invalid email.');
      }

      let user = await User.findOne({
        'local.email': email
      });

      if (!user || !user.verified) {
        return res.status(400).send('There is no user with this email.');
      }

      // Regenerate user's token & activate password reset for 48 hours
      user.verifyToken = randomstring.generate();
      user.recoverUntil = Date.now() + 1728E5;

      await user.save();

      // Send recovery email
      mail.sendRecoveryEmail(user, (err) => {
        if (err) {
          // Mail delivery failed
          res.status(500).send(err);
        } else {
          // Set HTTP status code `204 No Content`
          res.sendStatus(204);
        }
      });
    } catch (err) {
      res.status(500).send(err);
    }
  });

  /**
   * @api {post} /auth/reset Reset the password using the 'verifyToken'
   * @apiName Reset
   * @apiGroup Auth
   *
   * @apiParam {String} email         email address
   * @apiParam {String} token         user's token
   * @apiParam {String} newPassword   new password
   */
  router.post('/auth/reset', async (req, res) => {
    try {
      const userId = req.body.userId ? req.body.userId : null;
      const token = req.body.token ? req.body.token : null;

      if (!userId || !token) {
        return res.status(400).send('Invalid email or token.');
      }

      let user = await User.findOne({
        _id: userId
      });

      if (!user || !user.verified) {
        return res.status(400).send('Invalid user.');
      }

      if (token !== user.verifyToken) {
        return res.status(401).send('Invalid token.');
      }

      if (!user.recoverUntil || Date.now() > user.recoverUntil) {
        return res.status(401).send('Token has expired.');
      }

      if (req.body.newPassword && req.body.newPassword.length >= 8
        && req.body.newPassword.length <= 128) {
        // Change password
        user.local.password = user.generateHash(req.body.newPassword);
        delete req.body.newPassword;

        // Deauthorize user's token for password reset
        user.recoverUntil = 0;
        await user.save();

        res.sendStatus(200);
      } else {
        return res.status(400).send('Invalid password.');
      }
    } catch (err) {
      res.status(500).send(err);
    }
  });

  /**
   * @api {post} /auth/logout Logging out the current user
   * @apiName Logout
   * @apiGroup Auth
   */
  router.post('/auth/logout', (req, res) => {

    req.logOut();

    // Even though the logout was successful, send the status code
    // `401` to be intercepted and reroute the user to the appropriate
    // page
    res.sendStatus(401);
  });

  /**
   * @api {post} /auth/delete/:uid Delete the user
   * @apiName DeleteUser
   * @apiGroup Auth
   *
   * @apiParam {Number} uid User ID
   */
  router.delete('/auth/delete/:uid', admin, (req, res) => {

    User.remove({
      '_id' : ObjectId(req.params.uid)
    }, (err) => {

      // If there are any errors, return them
      if (err)
        return res.sendStatus(500);

      // HTTP Status code `204 No Content`
      res.sendStatus(204);
    });
  });
};
