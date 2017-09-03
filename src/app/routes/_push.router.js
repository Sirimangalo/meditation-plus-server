import User from '../models/user.model.js';
import PushSubscriptions from '../models/push.model.js';

export default (app, router) => {
  /**
   * @api {post} /api/push/register Register a new push subscription for an unique endpoint
   * @apiName PushRegister
   * @apiGroup Push
   *
   * @apiParam {Object} Connection data
   */
  router.post('/api/push/register', async (req, res) => {
    try {
      const endpoint = req.body.endpoint ? req.body.endpoint : null;
      if (!endpoint) return res.sendStatus(400);

      const user = await User.findOne({ _id : req.user._doc._id });
      if (!user) return res.sendStatus(403);

      const subscription = JSON.stringify(req.body);
      const doc =  await PushSubscriptions.findOneAndUpdate({ endpoint: endpoint }, {
        username: user.username,
        endpoint: endpoint,
        subscription: subscription
      }, {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true
      });

      res.json(doc);
    } catch (err) {
      res.status(500).send(err);
    }
  });
};
