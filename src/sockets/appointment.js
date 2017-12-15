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
  const roomLength = () => io.sockets.adapter.rooms['Appointment']
    ? io.sockets.adapter.rooms['Appointment'].length
    : 0;

  /**
   * method for checking if the socket has joined the room
   */
  const inRoom = () => io.sockets.adapter.sids[socket.id]['Appointment'] ? true : false;

  /**
   * Server Events
   * -------------
   *
   *  appointment:  Get appointment for now and optionally join room
   *  ready:        Inform server that user is ready to call
   *  message:      Broadcast message to room
   *  toggleMedia:  Notify room about cam/mic status change
   *  signal:       Broadcast RTC signalling data to room
   *  leave:        Leave room
   *
   *
   * Client Events
   * ------------
   *
   *  joined:       React with emitting 'ready'
   *  ready:        Set initiator status and start WebRTC call if possible
   *  message:      Show message in chat
   *  toggleMedia:  Indicate change of opponent's cam/mic
   *  signal:       Use signalling data for establishing RTC connection
   *  ended:        Show ending screen
   */


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

    // if an authorized user is already in the room 'Appointment', then this means that a
    // reconnect is given (-> second parameter).
    const appointment = await appointHelper.getNowAuthorized(userNow, roomLen === 1 && !inRoom());

    // send appointment and status to client
    socket.emit('appointment', {
      appointment: appointment,
      started: appointment && roomLen >= 1
    });

    // join appointment if requested and possible
    if (join === true && appointment && roomLen < 2 && !inRoom()) {
      // let socket join the room 'Appointment' where the exchanging of data and messages happens
      socket.join('Appointment');
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
          }
        );
      }
    }
  });

  /**
   * The 'ready' event is triggered on the client if he gets a 'joined' event.
   * It also contains a parameter which indicates if the client wants to be an
   * initiator (fixes a bug caused when both participants have different media
   * permissions).
   *
   * @param  {Boolean} initiator Whether or not client wants to be initiator for RTC
   */
  socket.on('appointment:ready', initiator => {
    const ready = inRoom() && roomLength() === 2;

    socket.emit('appointment:ready', { ready: ready, initiator: initiator });

    if (ready) {
      // both participants are there, the call can start.
      socket.broadcast.to('Appointment').emit('appointment:ready', { ready: ready, initiator: !initiator });
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

    io.to('Appointment').emit('appointment:message', {
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
  socket.on('appointment:toggleMedia', data => {
    if (!inRoom()) {
      return;
    }

    socket.broadcast.to('Appointment').emit('appointment:toggleMedia', {
      audio: data.audio,
      video: data.video
    });
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

    socket.broadcast.to('Appointment').emit('appointment:signal', data);
  });

  /**
   * The ':leave' event is being used for ending the appointment.
   */
  socket.on('appointment:leave', gracefully => {
    if (!inRoom()) {
      return;
    }

    socket.broadcast.to('Appointment').emit('appointment:ended', gracefully === true);
    socket.leave('Appointment');
  });
};
