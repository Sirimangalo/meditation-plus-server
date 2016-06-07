// Define routes for the Node backend

// Load our API routes for user authentication
import authRoutes from './routes/_authentication.router.js';

import messageRoutes from './routes/_message.router.js';
import commitmentRoutes from './routes/_commitment.router.js';
import meditationRoutes from './routes/_meditation.router.js';
import profileRoutes from './routes/_profile.router.js';

export default (app, router, passport, io) => {

  // ### Express Middlware to use for all requests
  router.use((req, res, next) => {
    // Make sure we go to the next routes and don't stop here...
    next();
  });

  // Define a middleware function to be used for all secured administration
  // routes
  let admin = (req, res, next) => {

    if (!req.isAuthenticated() || req.user.role !== 'admin')
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

  messageRoutes(app, router, io);
  commitmentRoutes(app, router);
  meditationRoutes(app, router);
  profileRoutes(app, router);

  // ### Frontend Routes

  // Route to handle all Angular requests
  router.get('*', (req, res) => {
    //** Note that the root is set to the parent of this folder, ie the app root **
   res.sendFile('/dist/index.html', { root: __dirname + "/../"});
  });
};