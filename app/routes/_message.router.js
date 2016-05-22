import Message from '../models/message.model.js';

let ObjectId = require('mongoose').Types.ObjectId;

export default (app, router, auth) => {

  /**
   * @api {get} /message Get chat history
   * @apiName ListMessages
   * @apiGroup Message
   *
   * @apiSuccess {Object[]} messages      List of recent messages.
   * @apiSuccess {String}   messages.text Message body
   * @apiSuccess {User}     messages.user The posting user
   */
  router.get('/message', auth, (req, res) => {
        Message
          .find()
          .populate('user', 'local.username')
          .exec((err, todo) => {
            if(err)
              res.send(err);

            else
              res.json(todo);
          });
    });

  /**
   * @api {post} /message Post a new message
   * @apiName AddMessage
   * @apiGroup Message
   *
   * @apiParam {String} text Message body
   */
  router.post('/message', auth, (req, res) => {
      Message.create({
        text: req.body.text,
        user: req.user,
      }, (err, message) => {
        if (err) {
          res.send(err, 400);
        }

        res.json(message);
      });
    });
};