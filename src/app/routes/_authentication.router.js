import User from '../models/user.model.js';
import jwt from 'jsonwebtoken';
import expressJwt from 'express-jwt';

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

      // Set HTTP status code `204 No Content`
      res.sendStatus(204);

    }) (req, res, next);
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

  router.get('/auth/verify/', (req, res) => {
    try {
      const token = req.params.token ? req.params.token : null;

      if (!token) {
        return res.sendStatus(400);
      }

      const user = await User.findOne({
        verifyToken: token,
        verified: false
      });

      if (user) {
        user.verified = true;
        await user.save();

        res.sendStatus(200);
      } else {
        res.sendStatus(400);
      }
    } catch (err) {
      res.status(500).send(err);
    }
  });
};
