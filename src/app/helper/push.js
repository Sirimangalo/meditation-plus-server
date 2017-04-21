import PushSubscriptions from '../models/push.model.js';
import webpush from 'web-push';

export default {
  send: async (userId, data) => {
    try {
      const subscription = await PushSubscriptions.find({
        user: userId
      });

      if (!subscription) {
        return;
      }

      subscription.map(sub => {
        webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        }, JSON.stringify(data));
      });
    } catch (err) {
      console.log(err);
    }
  }
};

