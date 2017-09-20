import appointHelper from '../app/helper/appointment.js';
import push from '../app/helper/push.js';

export default (socket, io) => {

  /**
   * method for retrieving user information from the socket
   */
  const user = () => socket.decoded_token._doc;

  /**
   * method for getting the room length
   */
  const roomLength = () => io.sockets.adapter.rooms['AppointCall']
    ? io.sockets.adapter.rooms['AppointCall'].length
    : 0;

  /**
   * method for checking if the socket has joined the room
   */
  const inRoom = () => io.sockets.adapter.sids[socket.id]['AppointCall'] ? true : false;


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

    // if an authorized user is already in the room 'AppointCall', then this means that a
    // reconnect is given (-> second parameter).
    const appointment = await appointHelper.getNow(userNow, roomLen === 1 && !inRoom());

    socket.emit('appointment', {
      appointment: appointment,
      started: appointment ? roomLen > 0 : true
    });

    // join appointment if requested and possible
    if (join === true && appointment && roomLen < 2 && !inRoom()) {
      // let socket join the room 'AppointCall' where the exchanging of data and messages happens
      socket.join('AppointCall');
      socket.emit('appointment:joined');

      // notify other party
      if (roomLength() === 1) {
        push.send(
          user().appointmentsCallee
            ? { _id: appointment.user }
            : {
                role: 'ROLE_ADMIN',
                appointmentsCallee: true
              },
          {
            title: 'Appointment Call Incoming',
            body: 'Please click on this notification or go to the schedule page',
            data: {
              url: '/schedule/call'
            }
            // TODO: call icon
        });
      }
    }
  });

  socket.on('appointment:ready', () => {
    const ready = inRoom() && roomLength() === 2;

    socket.emit('appointment:ready', { ready: ready, initiator: false });

    if (ready) {
      socket.broadcast.to('AppointCall').emit('appointment:ready', { ready: ready, initiator: true });
    }
  });

  /**
   * The ':message' event is being used for sending and receiving
   * text messages between the two participants of the live appointment call.
   *
   * @param  {String} message       Message to deliver
   */
  socket.on('appointment:message', message => {
    if (!inRoom() || !message || typeof(message) !== 'string' || message.length > 500) {
      return;
    }

    const userNow = user();

    io.to('AppointCall').emit('appointment:message', {
      user: {
        _id: userNow._id,
        name: userNow.name,
        username: userNow.username,
        gravatarHash: userNow.gravatarHash,
        country: userNow.country
      },
      text: message
    });
  });

  /**
   * The ':toggledMedia' event is being used when a user
   * disables his microphone/camera
   */
  socket.on('appointment:toggledMedia', (audio, video) => {
    if (!inRoom()) {
      return;
    }

    socket.broadcast.to('AppointCall').emit('appointment:toggledMedia', { audio, video });
  });

  /**
   * The ':signal' event is being used for exchanging signaling data
   * for the WebRTC connection between the two roomLength of the live appointment call.
   *
   * @param  {any} data     Signaling data
   */
  socket.on('appointment:signal', data => {
    if (!inRoom()) {
      return;
    }

    socket.broadcast.to('AppointCall').emit('appointment:signal', data);
  });

  /**
   * The ':leave' event is being used for ending the appointment.
   */
  socket.on('appointment:leave', endCall => {
    console.log('LEAVE', endCall);
    if (!inRoom()) {
      return;
    }

    if (endCall) {
      socket.broadcast.to('AppointCall').emit('appointment:ended', true);
    } else {
      console.log('HERE');
      socket.broadcast.to('AppointCall').emit('appointment:ready', { ready: false, initiator: false });
    }

    socket.leave('AppointCall');
  });
}
