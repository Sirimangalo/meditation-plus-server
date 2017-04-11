import { validateEnvVariables } from './config/env.conf.js';
import express from 'express';
import socketio from 'socket.io';
import http from 'http';
import cors from 'cors';
import expressJwt from 'express-jwt';
import mongoose from 'mongoose';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import methodOverride from 'method-override';
import passport from 'passport';
import base from './sockets/base';
import mongooseConf from './config/mongoose.conf.js';
import passportConf from './config/passport.conf.js';
import routes from './app/routes';
import webpush from 'web-push';

validateEnvVariables();

if (process.env.GOOGLE_API_KEY) {
  webpush.setGCMAPIKey(process.env.GOOGLE_API_KEY);
}

let app = express();
let server = http.createServer(app);
let io = socketio.listen(server);
let port = process.env.PORT || 8080;

base(io);
mongooseConf(mongoose);
passportConf(passport);

if (process.env.NODE_ENV !== 'test') {
  // Log requests to console
  app.use(morgan('combined'));
}

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.json({ type: 'application/vnd.api+json' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(methodOverride('X-HTTP-Method-Override'));
app.use(express.static(__dirname + '/client'));
app.use(passport.initialize());

let router = express.Router();
routes(app, router, passport, io);

// We are going to protect /api routes with JWT and /auth/delete
app.use('/api', expressJwt({
  secret: process.env.SESSION_SECRET
}));
app.use('/auth/delete', expressJwt({
  secret: process.env.SESSION_SECRET
}));

app.use('/', router);
server.listen(port);

export { app };
