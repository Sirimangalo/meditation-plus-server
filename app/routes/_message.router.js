import Message from '../models/message.model.js';

import moment from 'moment';

export default (app, router) => {

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
  router.get('/api/message', (req, res) => {
        Message
          .find()
          .populate('user', 'local.username profileImageUrl')
          .lean()
          .exec((err, messages) => {
            if(err) {
              res.status(500).send(err);
              return;
            }

            messages.map(message => {
              message.ago = moment(message.createdAt).fromNow();
              return message;
            });

            res.json(messages);
          });
    });

  /**
   * @api {post} /api/message Post a new message
   * @apiName AddMessage
   * @apiGroup Message
   *
   * @apiParam {String} text Message body
   */
  router.post('/api/message', (req, res) => {
      Message.create({
        text: req.body.text,
        user: req.user._doc,
      }, (err, message) => {
        if (err) {
          res.send(err, 400);
        }

        res.json(message);
      });
    });
};