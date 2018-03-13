import Message from '../models/message.model.js';
import Meeting from '../models/meeting.model.js';
import { logger } from '../helper/logger.js';
import appointHelper from '../helper/appointment.js';
import moment from 'moment';
import push from '../helper/push.js';

let ObjectId = require('mongoose').Types.ObjectId;

/**
 * Check whether a user is a teacher.
 *
 * @param      {any}      user    The user
 * @return     {boolean}          True if teacher, False otherwise.
 */
function isTeacher(user) {
  return typeof user !== 'undefined' &&
    'role' in user && user['role'] === 'ROLE_ADMIN' &&
    'isTeacher' in user && user['isTeacher'] === true;
}

export default (app, router, io, admin) => {
  /**
   * @api {get} /api/meeting/history  Get a list of past appointment meetings for user.
   * @apiName GetMeetingsHistory
   * @apiGroup Meeting
   */
  router.get('/api/meeting/history', async (req, res) => {
    try {
      const page = req.query.page ? parseInt(req.query.page, 10) : 0;
      const pageSize = req.query.pageSize ? parseInt(req.query.pageSize, 10) : 5;

      const meetings = await Meeting
        .find({
          participants: req.user._id
        })
        .skip(page * pageSize)
        .limit(pageSize)
        .sort({
          createdAt: 'descending'
        })
        .populate('participants', 'name username gravatarHash country')
        .populate({
          path: 'messages',
          model: 'Message',
          populate: {
            model: 'User',
            path: 'user',
            select: 'name username gravatarHash country'
          }
        })
        .lean()
        .exec();

      const length = await Meeting
        .find({
          participants: req.user._id
        })
        .count();

      res.json({ meetings: meetings, length: length });
    } catch (err) {
      logger.error('Meeting Error', err);
      res.status(500).send(err);
    }
  });

  /**
   * @api {get} /api/meeting  Find an appointment meeting for right now or automatically create one if possible.
   * @apiName GetMeeting
   * @apiGroup Meeting
   */
  router.get('/api/meeting', async (req, res) => {
    try {
      const teacher = isTeacher(req.user);
      let meeting = await Meeting
        .find({
          'participants.0': teacher ? { $exists: true } : req.user._id,
          createdAt: { $gt: moment().subtract(1, 'hour') }
        })
        .sort({
          'createdAt': 'desc'
        })
        .limit(1)
        .exec();

      if (meeting.length > 0) {
        meeting = meeting[0];

        if (typeof meeting['closedAt'] !== 'undefined') {
          if (moment().diff(meeting['closedAt'], 'minutes') <= 10) {
            return res.status(400).json('You\'ve recently had a meeting that is closed now.');
          }
        } else {
          if (teacher && meeting.participants.length === 1) {
            // automatically join if teacher
            meeting.participants.push(req.user._id);
            await meeting.save();
          }

          const populated = await Meeting
            .findOne({ _id: meeting._id })
            .populate('participants', 'name username gravatarHash country')
            .populate({
              path: 'messages',
              model: 'Message',
              populate: {
                model: 'User',
                path: 'user',
                select: 'name username gravatarHash country'
              }
            });

          return res.json(populated);
        }
      }

      // Teacher role is not supposed to create new meetings
      if (teacher) {
        return res.status(400).json('No meeting scheduled for now.');
      }

      // Try to create a new meeting if appointment is scheduled for regular user
      const appointment = await appointHelper.getNow(req.user);
      if (!appointment) {
        return res.status(400).json('No meeting scheduled for now.');
      }

      let newMeeting = await Meeting
        .create({
          appointment: appointment._id,
          participants: [ req.user._id ]
        });

      const populated = await Meeting
        .findOne({ _id: newMeeting._id })
        .populate('participants', 'name username gravatarHash country')
        .populate({
          path: 'messages',
          model: 'Message',
          populate: {
            model: 'User',
            path: 'user',
            select: 'name username gravatarHash country'
          }
        });

      // no-auth update
      io.sockets.emit('meeting-update', null);

      // send push notification to teacher
      push.send({
        role: 'ROLE_ADMIN',
        isTeacher: true
      }, {
        title: 'Appointment Call Incoming',
        body: `${req.user.name} has initiated an appointment meeting.`,
        tag: 'appointment-meeting',
        icon: req.user.gravatarHash.length === 32
          ? `https://www.gravatar.com/avatar/${req.user.gravatarHash}?s=192`
          : null,
        silent: false,
        data: {
          url: '/meet'
        }
      });

      res.json(populated);
    } catch (err) {
      logger.error('Meeting Error', err);
      res.status(500).send(err);
    }
  });

  router.post('/api/meeting/message', async (req, res) => {
    try {
      const meetingId = req.body.meetingId ? req.body.meetingId : '';
      const messageText = req.body.text ? req.body.text : '';

      if (!messageText || !meetingId || !ObjectId.isValid(meetingId)) {
        return res.sendStatus(400);
      }

      if (messageText.length > 500) {
        return res.status(400).send('Message was too long. Limit is 500 characters.');
      }

      const meeting = await Meeting.findOne({
        _id: meetingId,
        participants: req.user._id,
        closedAt: { $exists: false }
      });

      if (!meeting) {
        return res.status(400).send('You don\'t have a meeting right now.');
      }

      // create new message
      let message = await Message.create({
        private: true,
        text: messageText,
        user: req.user._id
      });

      // update meeting
      await meeting.update({
        $push: { messages: message }
      });

      message = await Message
        .findOne({ _id: message._id })
        .populate('user', 'name username gravatarHash country');

      // send message to sockets
      io.to('Meeting_' + meeting._id).emit('meeting-message', message);

      res.sendStatus(204);
    } catch (err) {
      logger.error('Meeting Error', err);
      res.status(500).send(err);
    }
  });

  router.post('/api/meeting/close', admin, async (req, res) => {
    try {
      const meetingId = req.body.meetingId ? req.body.meetingId : '';

      if (!meetingId || !ObjectId.isValid(meetingId)) {
        return res.sendStatus(400);
      }

      const meeting = Meeting.findOne({ _id: meetingId });

      if (!meeting) {
        return res.sendStatus(400);
      }

      await meeting.update({ closedAt: moment() });

      io.to('Meeting_' + meetingId).emit('meeting-closed');

      // Empty socket rooms
      io.of('/').in('Videochat_' + meetingId).clients((error, clients) => clients.map(socketId =>
        io.sockets.sockets[socketId].leave('Videochat_' + meeting._id)
      ));
      io.of('/').in('Meeting_' + meetingId).clients((error, clients) => clients.map(socketId =>
        io.sockets.sockets[socketId].leave('Meeting_' + meeting._id)
      ));

      res.sendStatus(204);
    } catch (err) {
      logger.error('Meeting Error', err);
      res.status(500).send(err);
    }
  });
};
