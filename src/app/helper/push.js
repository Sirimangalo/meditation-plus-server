import PushSubscriptions from '../models/push.model.js';
import webpush from 'web-push';

export default {
  send: (username, data) => {
    PushSubscriptions
      .find({
        username: username
      })
      .then(subs => subs.map(sub => {
        webpush.sendNotification(JSON.parse(sub.subscription), JSON.stringify(data));
      }));
  }
};

