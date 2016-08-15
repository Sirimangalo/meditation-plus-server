// Define routes for the Node backend

// Load our API routes for user authentication
import authRoutes from './routes/_authentication.router.js';

import messageRoutes from './routes/_message.router.js';
import testimonialRoutes from './routes/_testimonial.router.js';
import commitmentRoutes from './routes/_commitment.router.js';
import meditationRoutes from './routes/_meditation.router.js';
import profileRoutes from './routes/_profile.router.js';
import appointmentRoutes from './routes/_appointment.router.js';
import userRoutes from './routes/_user.router.js';
import liveRoutes from './routes/_livestream.router.js';

import User from './models/user.model.js';

export default (app, router, passport, io) => {

  // ### Express Middlware to use for all requests
  router.use(async (req, res, next) => {
    // update lastActive for user
    if (req.user) {
      let user = await User.findById(req.user._doc._id);

      const now = new Date();

      if (!user.lastActive ||
        (now.getTime() - user.lastActive.getTime()) > 120000) {
        // sending broadcast WebSocket message when a user switched from offline
        // to online.
        io.sockets.emit('user-online', req.user._doc._id);
      }

      user.lastActive = now;
      await user.save();
    }

    // Make sure we go to the next routes and don't stop here...
    next();
  });

  // Define a middleware function to be used for all secured administration
  // routes
  let admin = (req, res, next) => {

    if (!req.isAuthenticated() || req.user._doc.role !== 'ROLE_ADMIN')
      res.sendStatus(401);

    else
      next();
  };

  // ### Server Routes

  // Handle things like API calls,

  // #### Authentication routes

  // Pass in our Express app and Router.
  // Also pass in auth & admin middleware and Passport instance
  authRoutes(app, router, passport, admin);

  // #### RESTful API Routes

  testimonialRoutes(app, router, io, admin);
  messageRoutes(app, router, io, admin);
  commitmentRoutes(app, router, admin);
  meditationRoutes(app, router, io);
  profileRoutes(app, router);
  appointmentRoutes(app, router, io, admin);
  userRoutes(app, router, io, admin);
  liveRoutes(app, router, io);

  // ### Frontend Routes

  // Route to handle all Angular requests
  router.get('*', (req, res) => {
    //** Note that the root is set to the parent of this folder, ie the app root **
   res.sendFile('/client/index.html', { root: __dirname + "/../"});
  });
};