import PushSubscriptions from '../models/push.model.js';
import User from '../models/user.model.js';
import webpush from 'web-push';

const push = {
  send: (username, data) => {
    if (typeof username === 'string') {
      PushSubscriptions
        .find({
          username: username
        })
        .then(subs => subs.map(sub => {
          webpush.sendNotification(JSON.parse(sub.subscription), JSON.stringify(data));
        }));
    } else if (typeof username === 'object') {
      // interpret as query, run recursively
      User
        .find(username)
        .map(user => push.send(user, data));
    }
  }
};

export default push;

