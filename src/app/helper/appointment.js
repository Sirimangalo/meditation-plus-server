import {logger} from '../helper/logger.js';
import Settings from '../models/settings.model.js';
import Appointment from '../models/appointment.model.js';
import User from '../models/user.model.js';
import moment from 'moment-timezone';
import webpush from 'web-push';

let appointmentHelper = {
  /**
   * Converts Date or moment object to Integer representing the time.
   *
   * @param  {moment/Date}   Date or moment object
   * @return {Number}        Time as Number
   */
  timeToNumber: time => time instanceof Date
    ? time.getHours() * 100 + time.getMinutes()
    : (time instanceof moment ? time.hours() * 100 + time.minutes() : 0),

  /**
   * Parses hour as String.
   *
   * @param  {Number} hour Number representing time
   * @return {String}      'HH:mm' formatted time
   */
  printHour: hour => {
    const hourStr = '0000' + hour.toString();
    return hourStr.substr(-4, 2) + ':' + hourStr.substr(-2, 2);
  }
};

/**
 * Sends Push Notifications to all subscribed Aamins
 */
appointmentHelper.notify = () => new Promise(async (resolve) => {
  const settings = await Settings.findOne();

  if (!settings) {
    resolve('Could not load settings entity. Aborting.');
    return;
  }

  // Find admins subscribed to appointments
  const subscribedUsers = await User
    .find({
      role: 'ROLE_ADMIN',
      'notifications.appointment': { $exists: true, $ne: [] }
    })
    .populate('notifications.appointment');

  if (!subscribedUsers) {
    resolve('No users subscribed. Aborting.');
    return;
  }

  // Find next appointment for today
  const now = moment.tz(settings.appointmentsTimezone);

  let nextAppointment = await Appointment
    .find({
      user: { $exists: true, $ne: null },
      weekDay: now.weekday(),
      hour: {
        $gte: now.hours() * 100 + now.minutes(),
      }
    })
    .sort({
      hour: 'asc'
    })
    .limit(1)
    .populate('user', 'name gravatarHash')
    .lean()
    .then();


  if (!nextAppointment || nextAppointment.length < 1) {
    resolve('No appointment found. Aborting.');
    return;
  }

  nextAppointment = nextAppointment[0];

  // notification object for push message
  const notification = {
    title: 'Next Appointment',
    body: `${nextAppointment.user.name} is scheduled for ${appointmentHelper.printHour(nextAppointment.hour)} ${now.format('z')}`,
    tag: 'appointment-ticker',
    icon: nextAppointment.user.gravatarHash.length === 32
      ? `https://www.gravatar.com/avatar/${nextAppointment.user.gravatarHash}?s=192`
      : null,
    silent: true,
    data: {
      url: '/schedule',
      sticky: true
    },
    sticky: true // not supported by browsers (yet)
  };

  for (const user of subscribedUsers) {
    for (const sub of user.notifications.appointment) {
      try {
        await webpush.sendNotification(JSON.parse(sub.subscription), JSON.stringify(notification));
      } catch (err) {
        logger.error(err);
      }
    }
  }

  resolve('Notifications were send. Exiting.');
});


/**
 * Find an appointment for the given date/time.
 *
 * @param      {Date/Moment}          datetime         The date, moment, date-string or 'now'
 * @param      {number}               toleranceBefore  The minutes of tolerance before
 * @param      {number}               toleranceAfter   The minutes tolerance after
 * @return                                             The appointment object
 */
appointmentHelper.getNow = async (user, toleranceBefore = 5, toleranceAfter = 5) => {
  if (!user) {
    return null;
  }

  // load settings entity
  const settings = await Settings.findOne();
  let now = moment.tz(settings.appointmentsTimezone);

  if (!now.isValid()) {
    return null;
  }

  const minDate = now.clone().subtract(toleranceAfter, 'minutes');
  const maxDate = now.clone().add(toleranceBefore, 'minutes');

  let doc = null;
  if (minDate.weekday() !== maxDate.weekday()) {
    // handle the case where the tolerance range
    // includes two days
    doc = await Appointment
      .findOne({
        user: user._id,
        $or: [
          {
            weekDay: minDate.weekday(),
            hour: {
              $gte: appointmentHelper.timeToNumber(minDate)
            }
          },
          {
            weekDay: maxDate.weekday(),
            hour: {
              $lte: appointmentHelper.timeToNumber(maxDate)
            }
          }
        ]
      })
      .populate('user', 'name username gravatarHash')
      .exec();
  } else {
    doc = await Appointment
      .findOne({
        user: user._id,
        weekDay: minDate.weekday(),
        hour: {
          $gte: appointmentHelper.timeToNumber(minDate),
          $lte: appointmentHelper.timeToNumber(maxDate)
        }
      })
      .populate('user', 'name username gravatarHash')
      .exec();
  }

  return doc;
};

export default appointmentHelper;
