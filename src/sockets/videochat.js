import appointHelper from '../app/helper/appointment.js';
import push from '../app/helper/push.js';

export default (socket, io) => {

  /**
   * Define helper functions
   */
  const user = () => socket.decoded_token._doc;
  const roomLength = () => io.sockets.adapter.rooms['Videochat']
    ? io.sockets.adapter.rooms['Videochat'].length
    : 0;
  const inRoom = () => io.sockets.adapter.sids[socket.id]['Videochat'] ? true : false;


  /**
   * Find an appointment the user is allowed to join right now.
   * Join the appointment if parameter 'join' is set to true.
   *
   * @param  {Boolean} join   Whether to join an appointment or
   *                          only retrieve the appointment data
   */
  socket.on('appointment', async join => {
    // try to find an appointment that is due right now that the user can join
    const roomLen = roomLength();
    const userNow = user();

    // if an authorized user is already in the room 'Videochat', then this means that a
    // reconnect is given (-> second parameter).
    const appointment = await appointHelper.getNow(userNow, roomLen === 1 && !inRoom());
    socket.emit('appointment', appointment);


    // join appointment if requested and possible
    if (join === true && appointment && roomLen < 2 && !inRoom()) {
      // let socket join the room 'Videochat' where the exchanging of data and messages happens
      socket.join('Videochat');

      if (roomLen === 0) {
        // notify other participant
        const isAppHolder = userNow._id.toString() === appointment.user._id.toString();
        push.send({
          'notifications.appointment': true,
          _id: isAppHolder ? { $ne: null } : appointment.user,
          username:  isAppHolder ? 'yuttadhammo' : { $ne: null }
        }, {
          title: 'Appointment Call Incoming',
          body: 'Please click on this notification or go to the schedule page',
          data: {
            url: '/schedule/call'
          }
        });
      }

      // use an abitrary condition for determining the roles for WebRTC
      const isInitiator = (roomLen > 0);

      // let client know whether he has the initiator role (technical info for WebRTC)
      socket.emit('videochat:status', { rtcInitiator: isInitiator });

      // let other party in room know the opposite role.
      socket.broadcast.to('Videochat').emit('videochat:status', { rtcInitiator: !isInitiator });

      // send status message and signal clients to connect now if everybody is there
      io.to('Videochat').emit('videochat:status', {
        doConnect: isInitiator,
        message: isInitiator ? 'Connecting' : 'Waiting for opponent'
      });

      // send info message about joined user in chat
      io.to('Videochat').emit('videochat:message', {
        isMeta: true,
        text: userNow.name + ' (@' + userNow.username + ') joined the appointment.'
      });
    }
  });

  /**
   * The ':reconnect' event is being used when a user disconnects
   * without reason.
   */
  socket.on('videochat:reconnect', () => {
    if (!inRoom()) {
      return;
    }

    io.to('Videochat').emit('videochat:status', {
      connected: false,
      message: 'Trying to reconnect... Please hold on.',
      doConnect: true
    });

    io.to('Videochat').emit('videochat:message', {
      isMeta: true,
      text: 'Connection was interrupted.'
    });
  });

  /**
   * The ':message' event is being used for sending and receiving
   * text messages between the two participants of the live appointment call.
   *
   * @param  {String} message       Message to deliver
   * @param  {String} isMeta        Whether the message is a status text not from the user
   */
  socket.on('videochat:message', message => {
    if (!inRoom() || !message || message.length > 500) {
      return;
    }

    const userNow = user();

    io.to('Videochat').emit('videochat:message', {
      user: {
        _id: userNow._id,
        name: userNow.name,
        username: userNow.username,
        gravatarHash: userNow.gravatarHash
      },
      text: message
    });
  });

  socket.on('videochat:toggledMedia', (audio, video) => {
    if (!inRoom()) {
      return;
    }

    socket.broadcast.to('Videochat').emit('videochat:toggledMedia', { audio, video });
  });

  /**
   * The ':signal' event is being used for exchanging signaling data
   * for the WebRTC connection between the two roomLength of the live appointment call.
   *
   * @param  {any} data     Signaling data
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
