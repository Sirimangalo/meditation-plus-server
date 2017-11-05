import User from '../models/user.model.js';
import profileHelper from '../helper/profile.js';
import md5 from 'md5';
import { logger } from '../helper/logger.js';
import timezone from '../helper/timezone.js';
import moment from 'moment-timezone';

let ObjectId = require('mongoose').Types.ObjectId;

const getUser = async (query, req, res) =>  {
  try {
    let doc = await User
      .findOne(query)
      .lean()
      .exec();

    if (!doc) return res.sendStatus(404);

    // remove sensitive data
    delete doc.local['password'];
    delete doc['__v'];
    if (!doc.showEmail) {
      delete doc.local['email'];
    }

    // skip stats for public if hideStats is true
    if (doc.hideStats && doc._id.toString() !== req.user._doc._id) {
      return res.json(doc);
    }

    return res.json(doc);
  } catch (err) {
    logger.error(err);
    return res.status(400).send(err);
  }
};

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
    return getUser({ '_id': ObjectId(req.params.id) }, req, res);
  });

  /**
   * @api {get} /api/profile/username/:username Get profile details of a user by username
   * @apiName ShowProfileByUsername
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
  router.get('/api/profile/username/:username', async (req, res) => {
    return getUser({ 'username': req.params.username }, req, res);
  });

  router.get('/api/profile/stats/:username', async (req, res) => {
    const user = await User.findOne({ username: req.params.username });

    if (!user) {
      return res.sendStatus(404);
    }

    const result = {
      general: await profileHelper.statsGeneral(user._id),
      week: await profileHelper.statsWeek(user._id),
      month: await profileHelper.statsMonth(user._id),
      year: await profileHelper.statsYear(user._id)
    };

    // add field 'totalMeditating' for sum of walking and sitting
    Object.keys(result).map(key => result[key].map(
      data => data['totalMeditating'] = data['totalWalking'] + data['totalSitting']
    ));

    // add consecutive days
    result.consecutiveDays = await profileHelper.statsConsecutive(user._id);

    res.json(result);
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

    // watch out for undefined local field ?!
    try {
      // remove readonly data
      if (req.body.local.password) delete req.body.local.password;
      if (req.body._id) delete req.body._id;
      if (req.body.role) delete req.body.role;
      if (req.body.suspendedUntil) delete req.body.suspendedUntil;

      let user = await User.findById(req.user._doc._id);

      // change password if set
      if (req.body.newPassword && req.body.newPassword.length >= 8
        && req.body.newPassword.length <= 128) {
        user.local.password = user.generateHash(req.body.newPassword);
        delete req.body.newPassword;
      }

      for (const key of Object.keys(req.body)) {
        if (key === 'local' && req.body.local.email) {
          user.local.email = req.body.local.email;
          continue;
        }
        user[key] = req.body[key];
      }

      //test timezone string validity to avoid exceptions at retrieve on calculateStats
      if(user.timezone) {
        timezone(user, moment());
      }


      if(user.local) {
        user.gravatarHash = md5(user.local.email);
      }
      await user.save();

      res.sendStatus(200);
    } catch (err) {
      res.status(400).send(err);
    }
  });
};
