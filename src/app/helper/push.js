import PushSubscriptions from '../models/push.model.js';
import User from '../models/user.model.js';
import webpush from 'web-push';

const push = {

  /**
   * Send a Push message out to a user.
   *
   * @param  username   either username or query to find user(s)
   * @param  data       payload for notification
   */
  send: (username, data) => {
    if (!data) {
      return;
    }

    if (typeof username === 'string') {
      // find all subscribed devices of the user
      // and send notification.
      PushSubscriptions
        .find({
          username: username
        })
        .then(subs => subs.map(sub =>
          webpush.sendNotification(JSON.parse(sub.subscription), JSON.stringify(data))
        ));
    } else if (typeof username === 'object') {
      const now = Date.now();

      // interpret as query and run push.send() recursively
      User
        .find(username)
        .then(users => users.map(user => {
          // make notification silent if user is in meditation session
          data.silent = data.meditationAlarm === true || now <= user.lastMeditation;

          push.send(user.username, data);
        }));
    }
  }
};

export default push;

