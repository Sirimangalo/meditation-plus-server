import appointHelper from '../app/helper/appointment.js';

export default (socket, io) => {

  const user = () => socket.decoded_token._doc;
  const members = () => io.sockets.adapter.rooms['Videochat']
    ? io.sockets.adapter.rooms['Videochat'].length
    : 0;
  const inRoom = () => io.sockets.adapter.sids[socket.id]['Videochat'] ? true : false;

  /**
   * Find an appointment the user is allowed to join right now.
   * Join the appointment if parameter is true.
   */
  socket.on('appointment', async join => {
    const count = members();

    // only allow max. 2 participants
    if (count >= 2) {
      return;
    }

    // try to find an appointment that is due right now that the user can join
    const appointment = await appointHelper.getNow(user(), count === 1);
    socket.emit('appointment', appointment);

    if (join === true && appointment) {
      const initiator = (count === 1) && !inRoom();

      socket.join('Videochat');

      socket.emit('videochat:status', {
        rtcInitiator: initiator
      });

      socket.broadcast.to('Videochat').emit('videochat:status', {
        rtcInitiator: !initiator
      });

      io.to('Videochat').emit('videochat:status', {
        doConnect: initiator,
        message: initiator ? 'Connecting.' : 'Waiting for opponent.'
      });

      io.to('Videochat').emit('videochat:message', {
        isMeta: true,
        text: user().name + ' (@' + user().username + ') joined the appointment.'
      });
    }
  });

  /**
   * The ':reconnect' event is being used when a user disconnects
   * without reason. It sets the connection status back to
   *   - 1 if the disconnected user also left the socket room 'Videochat'
   *   - 2 if the user is still in the socket room 'Videochat'
   */
  socket.on('videochat:reconnect', () => {
    if (!inRoom()) {
      return;
    }

    io.to('Videochat').emit('videochat:status', {
      connected: false,
      message: 'Trying to reconnect... Please hold on.',
      reconnect: true
    });

    io.to('Videochat').emit('videochat:message', {
      isMeta: true,
      text: 'Connection was interrupted.'
    });
  });

  /**
   * The ':message' event is being used for sending and receiving
   * text messages between the two members of the live appointment call.
   */
  socket.on('videochat:message', (message, isMeta) => {
    if (!inRoom() || message.length > 500) {
      return;
    }

    const userNow = user();

    io.to('Videochat').emit('videochat:message', {
      isMeta: isMeta,
      user: {
        _id: userNow._id,
        name: userNow.name
      },
      text: (isMeta ? userNow.name + ' ' : '') + message
    });
  });

  /**
   * The ':signal' event is being used for exchanging signaling data
   * for the WebRTC connection between the two members of the live appointment call.
   */
  socket.on('videochat:signal', data => {
    if (!inRoom()) {
      return;
    }

    socket.broadcast.to('Videochat').emit('videochat:signal', data);
  });

  /**
   * The ':leave' event is being used for ending the appointment.
   */
  socket.on('videochat:leave', () => {
    if (!inRoom()) {
      return;
    }

    socket.leave('Videochat');
    io.to('Videochat').emit('videochat:status', {
      doEnd: true
    });
  });
}
