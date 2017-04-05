import PushSubscriptions from '../models/push.model.js';
import webpush from 'web-push';
import apn from 'apn';
import config from '../../config/config.json';

let apnProvider = new apnProvider(config.APPLE_APN);

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

        if (sub.endpoint) {
          // Use Google's push service (or Firefox etc.)
          webpush.sendNotification({
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          }, JSON.stringify(data));
        } else if (sub.deviceToken) {
          // Use Apple's push service
          const title = data.title || 'Meditation+';
          const body = data.body || data.message || '';

          let note = new apn.Notification();

          note.title = title;
          note.body = body;

          apnProvider.send(note, sub.deviceToken);
        }
      });
    } catch (err) {
      console.log(err);
    }
  }
};

