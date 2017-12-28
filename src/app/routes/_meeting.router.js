import Appointment from '../models/appointment.model.js';
import Message from '../models/message.model.js';
import Meeting from '../models/meeting.model.js';
import meetingHelper from '../helper/meeting.js';
import appointHelper from '../helper/appointment.js';
import moment from 'moment';

export default (app, router, io, admin) => {

  /**
   * @api {get} /api/meeting  Get a list of past appointment meetings for user.
   * @apiName GetMeetings
   * @apiGroup Meeting
   */
  router.get('/api/meeting', async (req, res) => {
    try {
      const page = req.query.page ? parseInt(req.query.page, 10) : 0;
      const pageSize = req.query.pageSize ? parseInt(req.query.pageSize, 10) : 5;

      const meetings = await Meeting
        .find({
          participants: req.user._doc._id
        })
        .skip(page * pageSize)
        .limit(pageSize)
        .sort({
          createdAt: 'descending'
        })
        .populate('messages')
        .populate('participants', 'name username gravatarHash country')
        .lean()
        .exec();

      const length = await Meeting
        .find({
          participants: req.user._doc._id
        })
        .count();

      res.json({ meetings: meetings, length: length });
    } catch (err) {
      console.log(err);
      res.status(500).send(err);
    }
  });

  /**
   * @api {get} /api/meeting/appointment  Find appointment that the user is able to join.
   * @apiName GetMeetingNow
   * @apiGroup Meeting
   */
  router.get('/api/meeting/appointment', async (req, res) => {
    try {
      // try to find an appointment that is scheduled for now
      // with a time tolerance of 10 minutes
      let appointment = await appointHelper.getAt('now', 5, 5);

      // check appointment and if user is authorized for it to join
      if (appointHelper.isAuthorized(req.user._doc, appointment)) {
        return res.json(appointment);
      }

      const meeting = await meetingHelper.getOngoing();

      if (meeting && appointHelper.isAuthorized(req.user._doc, meeting.appointment)) {
        appointment = await Appointment
          .findOne({ _id: meeting.appointment._id })
          .populate('user', 'name username gravatarHash country');

        return res.json(appointment);
      }

      return res.status(400).send('No appointment scheduled for now.');
    } catch (err) {
      console.log(err);
      res.status(500).send(err);
    }
  });

  /**
   * @api {get} /api/meeting/now  Find an appointment meeting for right now.
   * @apiName GetMeetingNow
   * @apiGroup Meeting
   */
  router.get('/api/meeting/now', async (req, res) => {
    try {
      const meeting = await meetingHelper.getOngoingByUser(req.user._doc);

      if (!meeting) {
        return res.sendStatus(400);
      }

      res.json(meeting);
    } catch (err) {
      console.log(err);
      res.status(500).send(err);
    }
  });

  /**
   * @api {post} /api/meeting  Join or create a meeting if possible.
   * @apiName GetMeetingNow
   * @apiGroup Meeting
   */
  router.post('/api/meeting/join', async (req, res) => {
    try {
      let meeting = await meetingHelper.getOngoing();

      if (meeting && 'participants' in meeting && meeting.participants.length >= 2) {
        return res.status(400).send('The meeting is full');
      }

      if (meeting && !appointHelper.isAuthorized(req.user._doc, meeting.appointment)) {
        return res.status(400).send('No appointment scheduled for now.');
      }

      let appointment;
      if (!meeting) {
        appointment = await appointHelper.getAt('now', 5, 5);

        if (appointment && !appointHelper.isAuthorized(req.user._doc, appointment)) {
          return res.status(400).send('No appointment scheduled for now.');
        }
      } else {
        appointment = meeting.appointment;
      }

      meeting = await meetingHelper.getOngoingOrCreate(appointment, req.user._doc);

      // send the changed object out to other particpants
      io.to('Meeting').emit('meeting-update', meeting);

      res.json(meeting);
    } catch (err) {
      console.log(err);
      res.status(500).send(err);
    }
  });

  router.post('/api/meeting/message', async (req, res) => {
    try {
      const messageText = req.body.text ? req.body.text : '';
      if (!messageText) {
        return res.sendStatus(400);
      }

      const meeting = await meetingHelper.getOngoingByUser(req.user._doc);
      if (!meeting) {
        return res.status(400).send('You don\'t have a meeting right now.');
      }

      // create new message
      let message = await Message.create({
        private: true,
        text: messageText,
        user: req.user._doc._id
      });

      // update meeting
      await meeting.update({
        $push: { messages: message }
      });

      message = await Message
        .findOne({ _id: message._id })
        .populate('user', 'name username gravatarHash country');

      // send message to sockets
      io.to('Meeting').emit('meeting-message', message);

      res.sendStatus(204);
    } catch (err) {
      console.log(err);
      res.status(500).send(err);
    }
  });

  router.put('/api/meeting/close/:id', admin, async (req, res) => {
    try {
      const meeting = Meeting.findOne({ _id: req.params.id });

      if (!meeting) {
        return res.sendStatus(400);
      }

      await meeting.update({ closedAt: moment() });

      res.sendStatus(204);
    } catch (err) {
      res.status(500).send(err);
    }
  });
};
