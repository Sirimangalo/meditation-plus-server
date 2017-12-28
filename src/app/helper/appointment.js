import {logger} from '../helper/logger.js';
import Settings from '../models/settings.model.js';
import Appointment from '../models/appointment.model.js';
import User from '../models/user.model.js';
import Meeting from '../models/meeting.model.js';
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
  },

  /**
   * Adds increment of hours to an appointment.
   *
   * @param  {Object} appointment   Appointment object
   * @param  {Number} increment     Amount of hours to add
   * @return {Object}               Modified appointment object
   */
  addIncrement: (appointment, increment) => {
    if (!appointment) {
      return null;
    }

    // add increment
    appointment.hour = (appointment.hour + 100 * increment);

    // handle possible overflow
    if (appointment.hour < 0) {
      // change day to previous day if negative hour
      appointment.weekDay = appointment.weekDay === 0 ? 6 : appointment.weekDay - 1;
      appointment.hour += 2400;
    } else if (appointment.hour >= 2400) {
      // change day to next day if positive overflow
      appointment.weekDay = (appointment.weekDay + 1) % 7;
      appointment.hour %= 2400;
    }

    return appointment;
  },

  /**
   * Checks whether an user is authorized for an appointment.
   * This applies if he is the holder or an admin.
   */
  // TODO: This doesn't work always as expected
  isAuthorized: (user, appointment) => appointment !== null && user !== null && 'user' in appointment &&
    ('role' in user && user.role === 'ROLE_ADMIN' || '_id' in user &&
      ('_id' in appointment.user
        ? appointment.user._id.toString() === user._id.toString()
        : appointment.user.toString() === user._id.toString()
    ))
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

  if (settings.appointmentsIncrement) {
    // add global increment
    nextAppointment = appointmentHelper.addIncrement(nextAppointment, settings.appointmentsIncrement);
  }

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
appointmentHelper.getAt = (datetime, toleranceBefore = 0, toleranceAfter = 0) => new Promise(async resolve => {
  // load settings entity
  const settings = await Settings.findOne();
  let at = datetime === 'now'
    ? moment.tz(settings.appointmentsTimezone)
    : moment(datetime);

  if (!at.isValid()) {
    return resolve(null);
  }

  // apply increment
  const increment = settings && settings.appointmentsIncrement
    ? settings.appointmentsIncrement
    : 0;
  at = at.subtract(increment, 'hours');

  const minDate = at.clone().subtract(toleranceAfter, 'minutes');
  const maxDate = at.clone().add(toleranceBefore, 'minutes');

  let doc = null;
  if (minDate.weekday() !== maxDate.weekday()) {
    // handle the case where the tolerance range
    // includes two days
    doc = await Appointment
      .findOne({
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
        weekDay: minDate.weekday(),
        hour: {
          $gte: appointmentHelper.timeToNumber(minDate),
          $lte: appointmentHelper.timeToNumber(maxDate)
        }
      })
      .populate('user', 'name username gravatarHash')
      .exec();
  }

  resolve(appointmentHelper.addIncrement(doc, increment));
});

export default appointmentHelper;
