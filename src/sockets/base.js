import * as socketiotJwt from 'socketio-jwt';
import Message from '../app/models/message.model.js';
import { logger } from '../app/helper/logger.js';

// This file contains the most basic functionality for server Socket.io
// functionality.

export default (io) => {

  // Jwt authentication
  io.use(socketiotJwt.authorize({
    secret: process.env.SESSION_SECRET,
    handshake: true
  }));

  io.set('transports', ['websocket']);
  io.set('origins', '*:*');

  io.on('connection', async socket => {
    // send out update for onlinecounter
    socket.broadcast.emit('onlinecounter:changed', 1);

    logger.info('a user connected:', socket.decoded_token._doc._id);
    logger.info(socket.id + ' connected via ('+ socket.client.conn.transport.constructor.name +')');

    // fetch latest message to detect missed timespans on the client
    const latestMessage = await Message
      .findOne()
      .sort('-createdAt')
      .then();

    socket.emit('connection', { latestMessage });

    // event for getting count of online users
    socket.on('onlinecounter:get', () => socket.emit('onlinecounter:get', io.engine.clientsCount));

    socket.on('disconnect', () => {
      // send out update for onlinecounter
      socket.broadcast.emit('onlinecounter:changed', -1);

      logger.info('a user disconnected');
    });
  });
};
