import Meeting from '../app/models/meeting.model.js';

export default (socket, io) => {
  /**
   * Get number of participants in a room
   */
  const countOfParticipants = room => io.sockets.adapter.rooms[room]
    ? io.sockets.adapter.rooms[room].length
    : 0;

  /**
   * Method for checking if the socket has joined a room
   */
  const hasJoined = room => io.sockets.adapter.sids[socket.id][room] ? true : false;

  /**
   * Syntax for events from Client to Server: 'meeting:eventName'
   * Syntax for events from Server to Client: 'meeting-eventName'
   */

  /**
   * Try to authenticate and join a socket room for an ongoing meeting.
   * This room is used for pushing new messages to the clients and to
   * authenticate for another room where the videochat takes place.
   */
  socket.on('meeting:join', async meetingId => {
    if (typeof meetingId !== 'string' || hasJoined('Meeting_' + meetingId)) {
      return;
    }

    const meeting = await Meeting
      .findOne({
        _id: meetingId,
        participants: socket.decoded_token._id,
        closedAt: { $exists: false }
      })
      .populate('participants', 'name username gravatarHash country');

    if (!meeting) {
      return;
    }

    socket.join('Meeting_' + meetingId);
    socket.broadcast.to('Meeting_' + meetingId).emit('meeting-joined', meeting.participants[meeting.participants.length - 1]);

    if (countOfParticipants('Videochat_' + meetingId) > 0) {
      io.to('Meeting_' + meetingId).emit('meeting-calling', true);
    }
  });

  /**
   * Leave the meeting room.
   */
  socket.on('meeting:leave', async meetingId => {
    if (typeof meetingId !== 'string' || !hasJoined('Meeting_' + meetingId)) {
      return;
    }

    socket.leave('Meeting_' + meetingId);
  });

  /**
   * Join the videochat room.
   */
  socket.on('meeting:videochat:join', async meetingId => {
    if (typeof meetingId !== 'string' || !hasJoined('Meeting_' + meetingId)) {
      return;
    }

    // Remove sockets with same user that already have joined
    // to prevent complications if the user tries to change his
    // client browser/device
    io.of('/').in('Videochat_' + meetingId).clients((error, clients) => clients.map(socketId => {
      const temp = io.sockets.sockets[socketId];
      if (socketId !== socket.id && 'decoded_token' in temp && temp.decoded_token._id === socket.decoded_token._id) {
        temp.leave('Videochat_' + meetingId);
      }
    }));

    if (hasJoined('Videochat_' + meetingId)) {
      socket.emit('videochat-joined');
    } else {
      socket.join('Videochat_' + meetingId);
      socket.emit('videochat-joined');
    }

    io.to('Meeting_' + meetingId).emit('meeting-calling', true);
  });

  /**
   * The 'ready' event is triggered on the client if he gets a 'joined' event.
   * It also contains a parameter which indicates if the client wants to be an
   * initiator (fixes a bug caused when both participants have different media
   * permissions).
   */
  socket.on('meeting:videochat:ready', async meetingId => {
    if (typeof meetingId !== 'string' || !hasJoined('Videochat_' + meetingId)) {
      return;
    }

    if (countOfParticipants('Videochat_' + meetingId) >= 2) {
      socket.emit('videochat-ready');
    }
  });

  socket.on('meeting:videochat:negotiate_request', data => {
    if (typeof data['meetingId'] !== 'string' || !hasJoined('Videochat_' + data['meetingId']) ||
      typeof data['initiatorProposal'] !== 'boolean') {
      return;
    }

    socket.broadcast.to('Videochat_' + data['meetingId']).emit('videochat-negotiate_request', data['initiatorProposal']);
  });

  socket.on('meeting:videochat:negotiate_response', data => {
    if (typeof data['meetingId'] !== 'string' || !hasJoined('Videochat_' + data['meetingId']) ||
      typeof data['accepted'] !== 'boolean') {
      return;
    }

    socket.broadcast.to('Videochat_' + data['meetingId']).emit('videochat-negotiate_response', data['accepted']);
  });

  socket.on('meeting:videochat:negotiate_confirm', meetingId => {
    if (typeof meetingId !== 'string' || !hasJoined('Videochat_' + meetingId)) {
      return;
    }

    io.to('Videochat_' + meetingId).emit('videochat-negotiate_confirmed');
  });

  /**
   * The 'media' event is being used when a user toggles his microphone/camera to inform
   * the other participant.
   */
  socket.on('meeting:videochat:media', data => {
    if (typeof data['meetingId'] !== 'string' || !hasJoined('Videochat_' + data['meetingId']) ||
      typeof data['media'] === 'undefined') {
      return;
    }

    socket.broadcast.to('Videochat_' + data['meetingId']).emit('videochat-media', data['media']);
  });

  /**
   * The 'signal' event is being used for exchanging signaling data for the WebRTC connection
   * between the two participatns of the videochat.
   */
  socket.on('meeting:videochat:signal', data => {
    if (typeof data['meetingId'] !== 'string' || !hasJoined('Videochat_' + data['meetingId']) || typeof data['signal'] === 'undefined') {
      return;
    }

    socket.broadcast.to('Videochat_' + data['meetingId']).emit('videochat-signal', data['signal']);
  });

  /**
   * The 'leave' event is being used for ending the videochat.
   */
  socket.on('meeting:videochat:leave', data => {
    if (typeof data['meetingId'] !== 'string' || !hasJoined('Videochat_' + data['meetingId']) || typeof data['gracefully'] !== 'boolean') {
      return;
    }

    socket.broadcast.to('Videochat_' + data['meetingId']).emit('videochat-ended', data['gracefully']);
    socket.leave('Videochat_' + data['meetingId']);

    if (countOfParticipants('Videochat_' + data['meetingId']) === 0) {
      io.to('Meeting_' + data['meetingId']).emit('meeting-calling', false);
    }
  });
};
