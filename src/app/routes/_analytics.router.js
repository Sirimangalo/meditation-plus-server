import User from '../models/user.model.js';
import Analytics from '../models/analytics.model.js';

export default (app, router, admin) => {
  router.get('/api/analytics-users', admin, async (req, res) => {
    console.log("§");
    try {
      // const data = Analytics.findOne();

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

      // // Update
      // const newUsers = await User
      //   .find({
      //     _id: { $gte: data.lastUpdated }
      //   })
      //   .exec();

      // Update possible profile changes

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
      console.log("get");
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
      console.log("err");
      res.status(500).send(err);
    }
  });

  router.get('/api/analytics-timezones', admin, async (req, res) => {
    try {
      console.log("get");
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
      console.log("err");
      res.status(500).send(err);
    }
  });
}


