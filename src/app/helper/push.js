import PushSubscriptions from '../models/push.model.js';
import webpush from 'web-push';
import config from '../../config/config.json';

export default {
  list: async () => {
    return await PushSubscriptions.find();
  },
  send: async (userId, payload) => {
    try {
      const subscription = await PushSubscriptions.find({
        user: userId
      });

      console.log(config['GCM_API_KEY']);

      if (!subscription) {
        return;
      }

      webpush.setGCMAPIKey(config['GCM_API_KEY']);

      const vapidKeys = webpush.generateVAPIDKeys();
      webpush.setVapidDetails(
        'mailto:it@sirimangalo.org',
        vapidKeys.publicKey,
        vapidKeys.privateKey
      );

      subscription.map(sub => {
        webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        }, JSON.stringify(payload));
      });
    } catch (err) {
      console.log(err);
    }
  }
};

