import Message from '../models/message.model.js';
import moment from 'moment';

export default (app, router, io, admin) => {

  function meditatedRecently(user) {
    if (!user || 'meditator' in user || !'lastMeditation' in user || !user.lastMeditation instanceof Date) {
      return false;
    }

    // calculate hours since last meditation
    let diff = Math.abs(new Date().getTime() - user.lastMeditation) / 36e5;

    if (diff <= 3) {
      return true
    }

    return false;
  }

  /**
   * @api {get} /api/message Get chat history
   * @apiName ListMessages
   * @apiGroup Message
   *
   * @apiSuccess {Object[]} messages           List of recent messages.
   * @apiSuccess {String}   messages.text      Message body
   * @apiSuccess {Date}     messages.createdAt Date of creation
   * @apiSuccess {String}   messages.ago       Relative time of creation as string
   * @apiSuccess {User}     messages.user      The posting user
   */
  router.get('/api/message', async (req, res) => {
    try {
      let messages = await Message
        .find()
        .sort([['createdAt', 'descending']])
        .limit(100)
        .populate('user', 'name gravatarHash lastMeditation')
        .lean()
        .then();

      messages.map(message => {
        message.ago = moment(message.createdAt).fromNow();
        message.user.meditator = meditatedRecently(message.user);

        return message;
      });

      messages.reverse();

      res.json(messages);
    } catch (err) {
      res.status(500).send(err);
    }
  });

  /**
   * @api {post} /api/message/:id/answer Sets message as answered
   * @apiName AnswerMessage
   * @apiGroup Message
   */
  router.post('/api/message/:id/answer', admin, async (req, res) => {
    try {
      let message = await Message.findById(req.params.id);

      message.answered = true;

      await message.save();

      res.sendStatus(200);
    } catch (err) {
      res.status(400).send(err);
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

      // add user details for response and broadcast
      let populated = await message.populate(
        'user',
        'name gravatarHash'
      ).execPopulate();

      let leanObject = populated.toObject();
      leanObject.ago = moment(leanObject.createdAt).fromNow();

      // sending broadcast WebSocket message
      io.sockets.emit('message', leanObject);

      res.json(leanObject);
    } catch (err) {
      res
        .status(err.name === 'ValidationError' ? 400 : 500)
        .send(err);
    }
  });

};
