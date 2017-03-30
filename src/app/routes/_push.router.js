import PushSubscriptions from '../models/push.model.js';

export default (app, router) => {
  router.post('/api/push/register', async (req, res) => {
    try {
      const endpoint = req.body.endpoint ? req.body.endpoint : null;
      const p256dh = req.body.keys && req.body.keys['p256dh'] ? req.body.keys['p256dh'] : '';
      const auth = req.body.keys && req.body.keys['auth'] ? req.body.keys['auth'] : '';

      if (!endpoint) {
        res.status(400).send();
      }

      await PushSubscriptions.create({
        user: req.user._doc._id,
        endpoint: endpoint,
        p256dh: p256dh,
        auth: auth
      });

      console.log('PUSH', req.body);

      res.status(200);
    } catch (err) {
      console.log(err, webpush);
      res.status(500).send(err);
    }
  });
};
