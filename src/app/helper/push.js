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
      const now = new Date();
      // prevent incorrect date comparison (for performance related differences in milliseconds)
      // to cause the meditation alarm to not pass.
      now.setSeconds(now.getSeconds() - 3);

      // interpret as query and run push.send() recursively
      User
        .find(username)
        .then(users => users.map(user => {
          // if the user is in a meditation session, only let the alarm through.
          // But if he's not, then don't let the alarm through (caught a stopped session).
          // The logical condition is like !(A xor B)
          if ((data.meditationAlarm === true) === (now <= user.lastMeditation)) {
            push.send(user.username, data);
          }
        }));
    }
  }
};

export default push;

