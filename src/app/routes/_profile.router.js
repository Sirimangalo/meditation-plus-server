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

      // initialize timespans
      let today = Date.now();
      let tenDaysAgo = Date.now() - 8.648E8;
      let tenWeeksAgo = Date.now() - 6.048E9;
      let tenMonthsAgo = Date.now() - 2.628E10;

      doc.meditations = {
        lastMonths: {},
        lastWeeks: {},
        lastDays: {},
        consecutiveDays: [],
        numberOfSessions: 0,
        currentConsecutiveDays: 0,
        totalMeditationTime: 0,
        averageSessionTime: 0
      };

      let lastDay = null;

      // iterate days
      for (let day = tenMonthsAgo; day <= today; day += 8.64E7) {
        doc.meditations.lastMonths[moment(day).format('MMM')] = 0;

        if (day >= tenWeeksAgo) {
          doc.meditations.lastWeeks[moment(day).format('w')] = 0;
        }
        if (day >= tenDaysAgo) {
          doc.meditations.lastDays[moment(day).format('Do')] = 0;
        }
      }
      let result = await Meditation
        .find({
          end: { $lt: today },
          user: doc._id
        })
        .sort([['createdAt', 'descending']])
        .lean()
        .exec();

      // sum meditation time
      result.map(entry => {
        const value = entry.sitting + entry.walking;

        doc.meditations.numberOfSessions++;
        doc.meditations.totalMeditationTime += value;

        // adding times of last 10 months
        doc.meditations.lastMonths[moment(entry.createdAt).format('MMM')] += value;

        // adding times of last 10 weeks
        if (entry.createdAt >= tenWeeksAgo) {
          doc.meditations.lastWeeks[moment(entry.createdAt).format('w')] += value;
        }

        // adding times of last 10 days
        if (entry.createdAt >= tenDaysAgo) {
          doc.meditations.lastDays[moment(entry.createdAt).format('Do')] += value;
        }

        // calculate consecutive days
        if (lastDay) {
          const duration = moment.duration(
            moment(lastDay).startOf('day').diff(moment(entry.createdAt).startOf('day'))
          );

          // only one day ago = consecutive day
          if (duration.asDays() ===   1) {
            doc.meditations.currentConsecutiveDays++

            // save 10-steps as badges
            if (doc.meditations.currentConsecutiveDays % 10 === 0) {
              doc.meditations.consecutiveDays.push(doc.meditations.currentConsecutiveDays);
            }
          } else if (duration.asDays() > 1) {
            // more than one day ago = reset consecutive days
            doc.meditations.currentConsecutiveDays = 0;
          }
        } else {
          doc.meditations.currentConsecutiveDays = 1;
        }

        lastDay = entry.createdAt;
      });

      doc.meditations.averageSessionTime =
        Math.round(doc.meditations.totalMeditationTime / doc.meditations.numberOfSessions);

      res.json(doc);
    } catch (err) {
      console.log(err);
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
