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

      // skip stats for public if hideStats is true
      if (doc.hideStats && doc._id !== req.user._doc._id) {
        return res.json(doc);
      }

      // initialize timespans
      let today = moment();
      let todayWithoutTime = moment().startOf('day');
      let tenDaysAgo = moment(todayWithoutTime).subtract(9, 'days');
      let tenWeeksAgo = moment(todayWithoutTime).subtract(10, 'weeks');
      let tenMonthsAgo = moment(todayWithoutTime).subtract(10, 'months');

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
      for (let day = moment(tenMonthsAgo); day <= todayWithoutTime; day.add(1, 'day')) {
        doc.meditations.lastMonths[day.format('MMM')] = 0;

        if (day >= tenWeeksAgo) {
          doc.meditations.lastWeeks[day.format('w')] = 0;
        }
        if (day >= tenDaysAgo) {
          doc.meditations.lastDays[day.format('Do')] = 0;
        }
      }
      let result = await Meditation
        .find({
          end: { $lt: today.format('x') },
          user: doc._id
        })
        .sort([['createdAt', 'ascending']])
        .lean()
        .exec();

      // sum meditation time
      result.map(entry => {
        const value = entry.sitting + entry.walking;

        doc.meditations.numberOfSessions++;
        doc.meditations.totalMeditationTime += value;
        const entryDate = moment(entry.createdAt);

        // adding times of last 10 months
        doc.meditations.lastMonths[entryDate.format('MMM')] += value;

        // adding times of last 10 weeks
        if (entryDate >= tenWeeksAgo) {
          doc.meditations.lastWeeks[entryDate.format('w')] += value;
        }

        // adding times of last 10 days
        if (entryDate >= tenDaysAgo) {
          doc.meditations.lastDays[entryDate.format('Do')] += value;
        }

        // calculate consecutive days
        if (lastDay) {
          const duration = moment.duration(
            moment(entryDate).startOf('day').diff(moment(lastDay).startOf('day'))
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
            doc.meditations.currentConsecutiveDays = 1;
          }
        } else {
          doc.meditations.currentConsecutiveDays = 1;
        }

        lastDay = moment(entryDate);
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
