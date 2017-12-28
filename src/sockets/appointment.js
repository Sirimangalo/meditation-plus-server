import Meeting from '../app/models/meeting.model.js';
import appointHelper from '../app/helper/appointment.js';
import meetingHelper from '../app/helper/meeting.js';
import push from '../app/helper/push.js';

export default (socket, io) => {

  /**
   * Get user object from socket
   */
  const user = () => socket.decoded_token._doc;

  /**
   * Get number of participants
   */
  const countOfParticipants = () => io.sockets.adapter.rooms['Meeting']
    ? io.sockets.adapter.rooms['Meeting'].length
    : 0;

  /**
   * method for checking if the socket has joined the room
   */
  const inMeeting = () => io.sockets.adapter.sids[socket.id]['Meeting'] ? true : false;

 /**
  * Syntax for events from Client to Server: 'meeting:eventName'
  * Syntax for events from Server to Client: 'meeting-eventName'
  */

  /**
   * The 'join' event is being used for joining the socket room
   * that will be used for communication and the establishing of
   * the rtc connection.
   */
  socket.on('meeting:join', async () => {
    if (inMeeting()) {
      socket.emit('meeting-joined');
    }

    const meeting = await meetingHelper.getOngoingByUser(user());

    if (!meeting) {
      return socket.emit('meeting-error', 'No meeting found.');
    }

    if (countOfParticipants() >= 2) {
      return socket.emit('meeting-error', 'Meeting is full.');
    }

    // join
    socket.join('Meeting');
    socket.emit('meeting-joined');
  });

  /**
   * The 'ready' event is triggered on the client if he gets a 'joined' event.
   * It also contains a parameter which indicates if the client wants to be an
   * initiator (fixes a bug caused when both participants have different media
   * permissions).
   *
   * @param  {Boolean} initiator Whether or not client wants to be initiator for RTC
   */
  socket.on('meeting:ready', async initiator => {
    const ready = inMeeting() && countOfParticipants() >= 2;

    if (ready) {
      // Log starting time
      const meeting = await meetingHelper.getOngoingByUser(user());
      if (!meeting.startedAt) {
        await meeting.update({
          startedAt: new Date()
        });
      }

      // notify all participants about ready state and initiator roles
      socket.emit('meeting-ready', initiator);
      socket.broadcast.to('Meeting').emit('meeting-ready', !initiator);
    }
  });

  /**
   * The ':toggledMedia' event is being used when a user
   * disables his microphone/camera
   */
  socket.on('meeting:media', data => {
    if (!inMeeting() || !data) {
      return;
    }

    socket.broadcast.to('Meeting').emit('meeting-media', {
      audio: data.audio === true,
      video: data.video === true
    });
  });

  /**
   * The ':signal' event is being used for exchanging signaling data
   * for the WebRTC connection between the two countOfParticipants of the live appointment call.
   *
   * @param  {any} data     Signaling data
   */
  socket.on('meeting:signal', data => {
    if (!inMeeting()) {
      return;
    }

    socket.broadcast.to('Meeting').emit('meeting-signal', data);
  });

  /**
   * The ':leave' event is being used for ending the appointment.
   */
  socket.on('meeting:leave', gracefully => {
    if (!inMeeting()) {
      return;
    }

    socket.broadcast.to('Meeting').emit('meeting-ended', gracefully === true);
    socket.leave('Meeting');
  });
};
