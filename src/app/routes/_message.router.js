import Message from '../models/message.model.js';
import meditatedRecently from './meditatedRecently.js';

import moment from 'moment';

export default (app, router, io) => {

  /**
   * @api {get} /api/message Get chat history
   * @apiName ListMessages
   * @apiGroup Message
   *
   * @apiSuccess {Object[]} messages           List of recent messages.
   * @apiSuccess {String}   messages.text      Message body
   * @apiSuccess {Date}     messages.createdAt Date of creation
   * @apiSuccess {User}     messages.user      The posting user
   */
  router.get('/api/message', async (req, res) => {
    try {
      const msgPerPage = 50;
      const page = req.query.page || 0;

      let messages = await Message
        .find()
        .sort([['createdAt', 'descending']])
        .skip(msgPerPage * page)
        .limit(msgPerPage)
        .populate('user', 'name gravatarHash lastMeditation country')
        .lean()
        .then();

      // add meditatedRecently to user
      messages.map(message => {
        if (message.user) {
          message.user.meditator = meditatedRecently(message.user);
        }

        return message;
      });

      messages.reverse();

      res.json(messages);
    } catch (err) {
      res.status(500).send(err);
    }
  });

  /**
   * @api {get} /api/message/synchronize Fetches messages for a specific timeframe
   * @apiName SynchronizeMessages
   * @apiGroup Message
   *
   * @apiSuccess {Object[]} messages           List of messages.
   * @apiSuccess {String}   messages.text      Message body
   * @apiSuccess {Date}     messages.createdAt Date of creation
   * @apiSuccess {User}     messages.user      The posting user
   */
  router.post('/api/message/synchronize', async (req, res) => {
    try {
      const timeFrameStart = moment(req.body.timeFrameStart);
      const timeFrameEnd = moment(req.body.timeFrameEnd);

      let messages = await Message
        .find({
          createdAt: {
            $gt: timeFrameStart,
            $lte: timeFrameEnd
          }
        })
        .sort([['createdAt', 'descending']])
        .populate('user', 'name gravatarHash lastMeditation country')
        .lean()
        .then();

      // add meditatedRecently to user
      messages.map(message => {
        if (message.user) {
          message.user.meditator = meditatedRecently(message.user);
        }

        return message;
      });

      messages.reverse();

      res.json(messages);
    } catch (err) {
      res.status(500).send(err);
    }
  });

  /**
   * @api {post} /api/message Post a new message
   * @apiName AddMessage
   * @apiGroup Message
   *
   * @apiParam {String} text Message body
   */
  router.post('/api/message', async (req, res) => {
    try {
      let message = await Message.create({
        text: req.body.text,
        user: req.user._doc
      });

      // fetch previous message to detect missed timespans on the client
      const previousMessage = await Message
        .findOne()
        .sort('-createdAt')
        .skip(1)
        .then();

      // add user details for response and broadcast
      let populated = await message.populate(
        'user',
        'name gravatarHash country lastMeditation'
      ).execPopulate();

      let leanObject = populated.toObject();
      leanObject.ago = moment(leanObject.createdAt).fromNow();
      leanObject.user.meditator = meditatedRecently(leanObject.user);

      // sending broadcast WebSocket message
      io.sockets.emit('message', {
        previous: previousMessage,
        current: leanObject
      });

      res.json(leanObject);
    } catch (err) {
      res
        .status(err.name === 'ValidationError' ? 400 : 500)
        .send(err);
    }
  });

};
