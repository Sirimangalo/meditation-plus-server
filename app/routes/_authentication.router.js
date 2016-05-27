import User from '../models/user.model.js';
import jwt from 'jsonwebtoken';

let ObjectId = require('mongoose').Types.ObjectId;

export default (app, router, passport, admin) => {

  /**
   * @api {get} /auth/loggedIn Check if logged in
   * @apiName LoggedIn
   * @apiGroup Auth
   *
   * @apiSuccess {Mixed} - Logged in: User data; Not logged in: 0
   */
  router.get('/auth/loggedIn', (req, res) => {

    // If the user is authenticated, return a user object
    // else return 0
    res.send(req.isAuthenticated() ? req.user : '0');
  });

  /**
   * @api {post} /auth/login Login
   * @apiName Login
   * @apiGroup Auth
   *
   * @apiParam {String} username Username
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

      if (err)
        return next(err);

      // If no user is returned...
      if (!user) {

        // Set HTTP status code `401 Unauthorized`
        res.status(401);

        // Return the info message
        return next(info.loginMessage);
      }

      // Use login function exposed by Passport to establish a login
      // session
      req.login(user, (err) => {

        if (err)
          return next(err);

        // Set HTTP status code `200 OK`
        res.status(200);

        // FIXME: Move secret to config.json
        let token = jwt.sign(req.user, '#### CHANGE THIS ####', {
            expiresIn: "1h"
        });
        // Return the token
        res.json({
          token,
          id: user._id
        });
      });

    }) (req, res, next);
  });

  /**
   * @api {post} /auth/signup Register a new account
   * @apiName SignUp
   * @apiGroup Auth
   *
   * @apiParam {String} username Username
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

        // Return the info message
        return next(info.signupMessage);
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

      // Model.find `$or` Mongoose condition
      $or : [
        { 'local.username' : req.params.uid },
        { 'local.email' : req.params.uid },
        { '_id' : ObjectId(req.params.uid) }
      ]
    }, (err) => {

      // If there are any errors, return them
      if (err)
        return next(err);

      // HTTP Status code `204 No Content`
      res.sendStatus(204);
    });
  });
};