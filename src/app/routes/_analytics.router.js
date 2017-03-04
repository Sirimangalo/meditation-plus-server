import User from '../models/user.model.js';
import Analytics from '../models/analytics.model.js';

let ObjectId = require('mongoose').Types.ObjectId;

export default (app, router, admin) => {
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

      // Update
      const newUsers = await User
        .find({
          _id: { $gte: data.lastUpdated }
        })
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

  router.get('/api/analytics-countries', admin, async (req, res) => {
    try {
      User.aggregate([
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
      res.status(500).send(err);
    }
  });

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

  router.post('/api/analytics-signups', admin, async (req, res) => {
    try {
      // Default interval: 1 day (= 864E5 ms)
      const interval = req.body.interval ? req.body.interval : 864E5;
      // Default interval: Today - 7 days (= 6048E5 ms)
      const minDate = req.body.minDate ? req.body.minDate : Date.now() - 6048E5;

      let data = {
        data: [],
        labels: []
      };

      let dtEnd = Date.now();
      let dtStart = dtEnd - interval;

      console.log(minDate, interval, dtEnd, dtStart);
      while (dtStart > minDate) {

        const minObjID = ObjectId(Math.floor(dtStart/1000).toString(16) + "0000000000000000");
        const maxObjID = ObjectId(Math.floor(dtEnd/1000).toString(16) + "0000000000000000");

        const userCount = await User
          .find({
            _id: { $gte: minObjID, $lte: maxObjID }
          })
          .count();

        data.data.push(userCount);
        data.labels.push(new Date(dtEnd));

        dtStart -= interval;
        dtEnd -= interval;
      }

      res.json(data);
    } catch (err) {
      console.log(err);
      res.status(500).send(err);
    }
  });
}


