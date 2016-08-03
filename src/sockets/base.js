import * as socketiotJwt from 'socketio-jwt';

// This file contains the most basic functionality for server Socket.io
// functionality.

export default (io) => {

  // Jwt authentication
  io.use(socketiotJwt.authorize({
    secret: process.env.SESSION_SECRET,
    handshake: true
  }));

  io.set('origins', '*:*');

  io.on('connection', socket => {

    console.log('a user connected:', socket.decoded_token._doc._id);

    socket.on('disconnect', () => {
      console.log('a user disconnected');
    });
  });

};