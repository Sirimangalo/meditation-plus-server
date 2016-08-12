import User from '../models/user.model.js';
import Meditation from '../models/meditation.model.js';
import moment from 'moment';
import md5 from 'md5';

let ObjectId = require('mongoose').Types.ObjectId;

export default (app, router) => {

  /**
   * @api {get} /api/profile Get profile details
   * @apiName GetProfile
   * @apiGroup Profile
   * @apiDescription Get the profile data of the currently logged in user.
   *
   * @apiSuccess {Object}     local           Details for local authentication
   * @apiSuccess {String}     local.email     Email address
   * @apiSuccess {String}     name            Name
   * @apiSuccess {Boolean}    showEmail       Show email publicly
   * @apiSuccess {String}     description     Profile description
   * @apiSuccess {String}     website         Website
   * @apiSuccess {String}     country         Country
   * @apiSuccess {String}     gravatarHash    Hash for Gravatar
   */
  router.get('/api/profile', async (req, res) => {
    try {
      let doc = await User
        .findOne({
          _id: req.user._doc._id
        })
        .lean()
        .exec();

      delete doc.local['password'];
      delete doc['__v'];

      res.json(doc);
    } catch (err) {
      res.status(400).send(err);
    }
  });

  /**
   * @api {get} /api/profile/:id Get profile details of a user
   * @apiName ShowProfile
   * @apiGroup Profile
   * @apiDescription Get the profile data of a user.
   *
   * @apiSuccess {Object}     local             Details for local authentication
   * @apiSuccess {String}     local.email       Email address (if public)
   * @apiSuccess {String}     name              Name
   * @apiSuccess {String}     description       Profile description
   * @apiSuccess {String}     website           Website
   * @apiSuccess {String}     country           Country
   * @apiSuccess {Object}     meditations       Last week meditation times
   * @apiSuccess {String}     gravatarHash      Hash for Gravatar
   */
  router.get('/api/profile/:id', async (req, res) => {
    try {
      console.log('find by', req.params);
      let doc = await User
        .findOne({
          '_id': ObjectId(req.params.id)
        })
        .lean()
        .exec();

      if (!doc) return res.sendStatus(404);

      // remove sensitive data
      delete doc.local['password'];
      delete doc['__v'];
      if (!doc.showEmail) {
        delete doc.local['email'];
      }

      // adds weekly meditation data
      let endOfWeek = Date.now();
      let startOfWeek = Date.now() - 6.048E8;

      doc.meditations = {};

      // iterate days
      for (let day = startOfWeek; day <= endOfWeek; day += 8.64E7) {
        doc.meditations[moment(day).format('Do')] = 0;
      }
      let result = await Meditation
        .find({
          // 1 week
          end: { $lt: endOfWeek, $gt: startOfWeek },
          user: doc._id
        })
        .lean()
        .exec();

      // sum meditation time
      result.map(entry => {
        doc.meditations[moment(entry.createdAt).format('Do')] += entry.sitting + entry.walking;
      });

      res.json(doc);
    } catch (err) {
      res.status(400).send(err);
    }
  });

  /**
   * @api {put} /api/profile Update profile
   * @apiName UpdateProfile
   * @apiGroup Profile
   * @apiDescription Updating the profile of the currently logged in user.
   *
   * @apiParam {Boolean}    showEmail       Show email publicly
   * @apiParam {String}     description     Profile description
   * @apiParam {String}     website         Website
   * @apiParam {String}     country         Country
   * @apiParam {String}     gravatarHash    Hash for Gravatar
   */
  router.put('/api/profile', async (req, res) => {
    // remove readonly data
    if (req.body.local) delete req.body.local;
    if (req.body._id) delete req.body._id;

    try {
      let user = await User.findById(req.user._doc._id);

      // change password if set
      if (req.body.newPassword) {
        user.local.password = user.generateHash(req.body.newPassword);
        delete req.body.newPassword;
      }

      for (const key of Object.keys(req.body)) {
        if (key === 'role') {
          continue;
        }
        user[key] = req.body[key];
      }
      user.gravatarHash = md5(user.local.email);
      await user.save();

      res.sendStatus(200);
    } catch (err) {
      res.status(400).send(err);
    }
  });
};
