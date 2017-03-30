import PushSubscriptions from '../models/push.model.js';

export default (app, router) => {
  /**
   * @api {post} /api/push/register Save the browser's (service worker) push subscription in Database
   * @apiName PushRegister
   * @apiGroup Push
   *
   * @apiParam {endpoint} string Endpoint URL of subscription
   * @apiParam {keys} Object Encryption keys for sending messages
   */
  router.post('/api/push/register', async (req, res) => {
    try {
      // Cleanup old (7 days) subscription first of all
      PushSubscriptions
        .find({
          updatedAt: { $lt: Date.now() - 6048e5}
        })
        .remove()
        .exec();

      const endpoint = req.body.endpoint ? req.body.endpoint : null;
      const p256dh = req.body.keys && req.body.keys['p256dh'] ? req.body.keys['p256dh'] : '';
      const auth = req.body.keys && req.body.keys['auth'] ? req.body.keys['auth'] : '';

      if (!endpoint) {
        res.status(400).send();
      }

      // Check for already existing subscription
      const subscription = await PushSubscriptions.findOne({
        endpoint: endpoint
      });

      if (subscription) {
        subscription.update({
          user: req.user._doc._id,
          p256dh: p256dh,
          auth: auth
        });
      } else {
        await PushSubscriptions.create({
          user: req.user._doc._id,
          endpoint: endpoint,
          p256dh: p256dh,
          auth: auth
        });
      }

      res.status(200).send();
    } catch (err) {
      console.log(err);
      res.status(500).send(err);
    }
  });
};
