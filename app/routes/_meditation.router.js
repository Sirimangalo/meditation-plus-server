import Meditation from '../models/meditation.model.js';

let ObjectId = require('mongoose').Types.ObjectId;

export default (app, router, auth) => {

  /**
   * @api {get} /meditation Get meditation data
   * @apiName ListMeditations
   * @apiGroup Meditation
   *
   * @apiSuccess {Object[]} meditations           List of recent sessions
   * @apiSuccess {Number}   meditations.walking   Time of walking
   * @apiSuccess {Number}   meditations.sitting   Time of sitting
   * @apiSuccess {Date}     meditations.end       End of meditation
   * @apiSuccess {Date}     meditations.createdAt Start of meditation
   * @apiSuccess {Object}   meditations.user      The meditating User
   */
  router.get('/meditation', auth, (req, res) => {
        Meditation
          .find({
            end: { $gt: Date.now() }
          })
          .populate('user', 'local.username')
          .exec((err, todo) => {
            if(err)
              res.send(err);

            else
              res.json(todo);
          });
    });

  /**
   * @api {post} /meditation Start a new meditation session
   * @apiName AddMeditation
   * @apiGroup Meditation
   *
   * @apiParam {Number} sitting Sitting time
   * @apiParam {Number} walking Walking time
   */
  router.post('/meditation', auth, (req, res) => {
      let total = parseInt(req.body.sitting, 10) + parseInt(req.body.walking, 10);

      Meditation.create({
        sitting: req.body.sitting,
        walking: req.body.walking,
        end: new Date(new Date().getTime() + total * 60000),
        user: req.user
      }, (err, message) => {
        if (err) {
          res.status(400).send(err);
        }

        res.json(message);
      });
    });
};