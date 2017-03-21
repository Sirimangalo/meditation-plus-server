import User from '../models/user.model.js';
import Meditation from '../models/meditation.model.js';
import moment from 'moment';

let ObjectId = require('mongoose').Types.ObjectId;

export default (app, router, admin) => {

  /**
   * @api {get} /api/analytics-users Get statistics of all user accounts
   * @apiName GetGeneralStats
   * @apiGroup analytics
   *
   * @apiSuccess {Object}   userdata             Object containing all data
   * @apiSuccess {Number}   userdata.count       Count of all users
   * @apiSuccess {Object[]} userdata.admins      List of all admin accounts
   * @apiSuccess {Object[]} userdata.suspended   List of all suspended accounts
   * @apiSuccess {Number}   userdata.inactive    Count of inactive users
   */
  router.get('/api/analytics-users', admin, async (req, res) => {
    try {
      const count = await User.count();

      const admins = await User
        .find({
          role: 'ROLE_ADMIN'
        }, 'name gravatarHash _id country')
        .lean()
        .exec();

      const suspended = await User
        .find({
          suspendedUntil: { $gt: Date.now() }
        }, 'name gravatarHash _id country')
        .lean()
        .exec();

      const inactive = await User
        .find({
          // older than 3 months (90 days) 7776E6
          lastActive: { $lte: Date.now() - 7776E6 }
        })
        .count()
        .exec();

      res.json({
        count: count,
        admins: admins,
        suspended: suspended,
        inactive: inactive
      });
    } catch (err) {
      res.status(500).send(err);
    }
  });

  /**
   * @api {get} /api/analytics-countries Get statistics of the countries of all accounts
   * @apiName GetCountryStats
   * @apiGroup analytics
   *
   * @apiSuccess {Object[]} countries  List of all countries and their count of users
   */
  router.get('/api/analytics-countries', admin, async (req, res) => {
    try {
      User
        .aggregate([
        {
          $group: {
            _id: '$country', count: { $sum: 1 }
          }
        },
        { $sort : { count : -1} },
        { $limit : 10 }
      ], (err, countries) => {
        if (err) return handleError(err);
        res.json(countries);
      });
    } catch (err) {
      console.log(err)
      res.status(500).send(err);
    }
  });

  /**
   * @api {get} /api/analytics-timezones Get statistics of the timezone of all accounts
   * @apiName GetTimezoneStats
   * @apiGroup analytics
   *
   * @apiSuccess {Object[]} timezones  List of all timezones and their count of users
   */
  router.get('/api/analytics-timezones', admin, async (req, res) => {
    try {
      User.aggregate([
        {
          $group: {
            _id: '$timezone', count: { $sum: 1 }
          }
        },
        { $sort : { count : -1} },
        { $limit : 10 }
      ], (err, timezones) => {
        if (err) return handleError(err);
        res.json(timezones);
      });
    } catch (err) {
      res.status(500).send(err);
    }
  });

  /**
   * @api {get} /api/analytics-signups Get statistics about new accounts
   * @apiName GetSignupStats
   * @apiGroup analytics
   *
   * @apiSuccess {Object} signupChartData  Data for linechart
   */
  router.post('/api/analytics-signups', admin, async (req, res) => {
    try {
      // Default interval: 1 day (= 864E5 ms)
      const interval = req.body.interval ? req.body.interval : 864E5;

      // Default interval: Today - 7 days (= 6048E5 ms)
      const minDate = req.body.minDate ? req.body.minDate : Date.now() - 6048E5;
      const dtFormat = req.body.format ? req.body.format : 'MM/DD/YY';

      let data = {
        data: [],
        labels: []
      };

      let dtEnd = Date.now();
      let dtStart = dtEnd - interval;

      while (dtStart > minDate) {
        // Use MongoDB's id to find new users within the current timespan
        const minObjID = ObjectId(Math.floor(dtStart / 1000).toString(16) + "0000000000000000");
        const maxObjID = ObjectId(Math.floor(dtEnd / 1000).toString(16) + "0000000000000000");

        const userCount = await User
          .find({
            _id: { $gte: minObjID, $lte: maxObjID }
          })
          .count();

        data.data.push(userCount);
        data.labels.push(moment(dtEnd).format(dtFormat));

        dtStart -= interval;
        dtEnd -= interval;
      }

      data.data.reverse();
      data.labels.reverse();

      res.json(data);
    } catch (err) {
      res.status(500).send(err);
    }
  });

  /**
   * @api {get} /api/analytics-signups Get statistics about number of meditation sessions
   * @apiName GetMeditationStats
   * @apiGroup analytics
   *
   * @apiSuccess {Object} meditationChartData  Data for linechart
   */
  router.post('/api/analytics-meditations', admin, async (req, res) => {
    try {
      // Default interval: 1 day (= 864E5 ms)
      const interval = req.body.interval ? req.body.interval : 864E5;

      // Default interval: Today - 7 days (= 6048E5 ms)
      const minDate = req.body.minDate ? req.body.minDate : Date.now() - 6048E5;
      const dtFormat = req.body.format ? req.body.format : 'MM/DD/YY';

      let data = {
        data: [],
        labels: []
      };

      let dtEnd = Date.now();
      let dtStart = dtEnd - interval;

      while (dtStart > minDate) {
        const meditationCount = await Meditation
          .find({
            end: { $gte: dtStart, $lte: dtEnd }
          })
          .count();

        data.data.push(meditationCount);
        data.labels.push(moment(dtEnd).format(dtFormat));

        dtStart -= interval;
        dtEnd -= interval;
      }

      data.data.reverse();
      data.labels.reverse();

      res.json(data);
    } catch (err) {
      res.status(500).send(err);
    }
  });
}


