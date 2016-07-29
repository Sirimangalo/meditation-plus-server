import Testimonial from '../models/testimonials.model.js';

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
   * @apiSuccess {String}   messages.ago       Relative time of creation as string
   * @apiSuccess {User}     messages.user      The posting user
   */
  router.get('/api/testimonials', async (req, res) => {
    try {
      let messages = await Testimonial
        .find()
        .populate('user', 'local.username profileImageUrl')
        .lean()
        .then();

      messages.map(message => {
        message.ago = moment(message.createdAt).fromNow();
        return message;
      });

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
  router.post('/api/testimonials', async (req, res) => {
    try {
      let message = await Testimonial.create({
        text: req.body.text,
        user: req.user._doc,
        reviewed: false
      });

      // add user details for response and broadcast
      let populated = await message.populate(
        'user',
        'local.username profileImageUrl'
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
