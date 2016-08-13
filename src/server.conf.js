// *server.conf.js*

//  This is the file where we will:
//  - Configure our application
//  - Connect to our database
//  - Create our Mongoose models
//  - Define routes for our RESTful API
//  - Define routes for our frontend Angular application
//  - Set the app to listen on a port so we can view it in our browser

// # Node Env Variables

// Load Node environment variable configuration file
import {validateEnvVariables} from './config/env.conf.js';

// Set up appropriate environment variables if necessary
validateEnvVariables();

// # Modules

// Load Express
import express from 'express';
// Load Socket.io
import socketio from 'socket.io';
// Load Node http module
import http from 'http';
// CORS support
import cors from 'cors';
// JWT Support
import expressJwt from 'express-jwt';
// Create our app with Express
let app = express();

// Enable CORS
app.use(cors());

// Create a Node server for our Express app
let server = http.createServer(app);
// Integrate Socket.io
let io = socketio.listen(server);
// Load Mongoose for MongoDB interactions
import mongoose from 'mongoose';
// Log requests to the console (Express 4)
import morgan from 'morgan';
// Pull information from HTML POST (express 4)
import bodyParser from 'body-parser';
// Simulate DELETE and PUT (Express 4)
import methodOverride from 'method-override';
// PassportJS
import passport from 'passport';
import cookieParser from 'cookie-parser';
import session from 'express-session';

// # Configuration

// Load Socket.io server functionality
import base from './sockets/base';

base(io);

// Set the port for this app
let port = process.env.PORT || 8080;

// Load Mongoose config file for connecting to MongoDB instance
import mongooseConf from './config/mongoose.conf.js';

// Pass Mongoose configuration Mongoose instance
mongooseConf(mongoose);

// Import PassportJS configuration
import passportConf from './config/passport.conf.js';

// Pass Passport configuration our PassportJS instance
passportConf(passport);

// Log requests to console
app.use(morgan('combined'));

// ## Get all data/stuff of the body (POST) parameters

// Parse application/json
app.use(bodyParser.json());
// Parse application/vnd.api+json as json
app.use(bodyParser.json({ type: 'application/vnd.api+json' }));
// Parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));

// Override with the X-HTTP-Method-Override header in the request. Simulate DELETE/PUT
app.use(methodOverride('X-HTTP-Method-Override'));
// Set the static files location /public/img will be /img for users
app.use(express.static(__dirname + '/client'));

// ## Passport JS
app.use(passport.initialize());

// ## Routes

// Get an instance of the express Router
let router = express.Router();

// Load our application API routes
// Pass in our express and express router instances
import routes from './app/routes';

// Pass in instances of the express app, router, and passport
routes(app, router, passport, io);

// We are going to protect /api routes with JWT
// FIXME: Move secret to config.json
app.use('/api', expressJwt({ secret: process.env.SESSION_SECRET }));
app.use('/', router);
// ### Ignition Phase

server.listen(port);

// Shoutout to the user
console.log(`Wizardry is afoot on port ${port}`);

// Expose app
export {app};