import {logger} from '../helper/logger.js';
import Settings from '../models/settings.model.js';
import Appointment from '../models/appointment.model.js';
import User from '../models/user.model.js';
import moment from 'moment-timezone';
import webpush from 'web-push';

/**
 * Converts Date or moment object to Integer representing the time.
 *
 * @param  {moment/Date}   Date or moment object
 * @return {Number}        Time as Number
 */
function timeToNumber(time): Number {
  return time instanceof Date
    ? time.getHours() * 100 + time.getMinutes()
    : (time instanceof moment ? time.hours() * 100 + time.minutes() : 0);
}

let appointmentHelper = {
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
    .findOne({
      user: { $exists: true, $ne: null },
      weekDay: now.weekday(),
      hour: {
        $gte: now.hours() * 100 + now.minutes(),
      }
    })
    .populate('user', 'name gravatarHash')
    .then();


  if (!nextAppointment) {
    resolve('No appointment found. Aborting.');
    return;
  }

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
 * Searches for appointments the user is allowed to
 * join right now. For regular users this means at
 * the time of their booked appointment (with a 5 minute
 * tolerance). For admins marked as teacher, it means
 * within the timespan of 5 minutes before any appointment
 * starts and 25 minutes after it was scheduled.
 *
 * @param  {Object}  user      User that needs authorization
 * @param  {Boolean} reconnect If set to true, the time tolarance
 *                             for regular users is the same as for
 *                             admins.
 *
 * @return                     the appointment object
 */
appointmentHelper.getNow = (user, reconnect = false) => new Promise(async (resolve) => {
  if (!user) {
    return resolve(null);
  }

  // load settings entity
  const settings = await Settings.findOne();

  // appointments are formatted in this timezone
  const now = moment.tz(settings.appointmentsTimezone);

  const increment = settings && settings.appointmentIncrement
    ? settings.appointmentIncrement
    : 0;

  // find any appointment for right now
  const doc = await Appointment
    .findOne({
      weekDay: now.weekday(),
      hour: {
        $lte: timeToNumber(
          // 5 minutes before appointment
          now.clone().add(5 + 60 * increment , 'minutes')
        ),
        $gte: timeToNumber(
          // 25 minutes after appointment
          now.clone().subtract(25 + 60 * increment, 'minutes')
        )
      },
      user: { $exists: true, $ne: null }
    })
    .populate('user', 'name username gravatarHash')
    .exec();

  if (!doc) {
    return resolve(null);
  }

  // check if user is admin and marked as teacher
  const isCallee = user.role === 'ROLE_ADMIN' && user.appointmentsCallee === true;

  // check if appointment is the one of requested user
  const isOwnAppointment = doc.user._id.toString() === user._id.toString();
  // check whether the time now is before 10 minutes after the appointment starts
  const isAppOnTime = doc.hour >= timeToNumber(now.clone().subtract(10 + 60 * increment, 'minutes'));


  if (doc && (isCallee || isOwnAppointment && (reconnect || isAppOnTime))) {

    if (!isCallee && !reconnect) {
      // register the user's request to initiate an appointment.
      // Use 'await' in order to not confuse the count of
      // the appointments before this update with the count
      // afterwards.
      await User
        .findOneAndUpdate({
          _id: user._id
        }, {
          $addToSet: { appointments: moment.utc().startOf('day').toDate() }
        });
    }

    return resolve(doc);
  }

  resolve(null);
});

export default appointmentHelper;
