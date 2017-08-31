import Appointment from '../models/appointment.model.js';
import Settings from '../models/settings.model.js';
import User from '../models/user.model.js';
import moment from 'moment-timezone';

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

const appointmentHelper = {
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
   * @param  {Object} entry     Appointment object
   * @param  {Number} increment Amount of hours to add
   * @return {Object}           Modified appointment object
   */
  addIncrement: (entry, increment) => {
    // add increment
    entry.hour = (entry.hour + 100 * increment);

    // handle possible overflow
    if (entry.hour < 0) {
      // change day to previous day if negative hour
      entry.weekDay = entry.weekDay === 0 ? 6 : entry.weekDay - 1;
      entry.hour += 2400;
    } else if (entry.hour >= 2400) {
      // change day to next day if positive overflow
      entry.weekDay = (entry.weekDay + 1) % 7;
      entry.hour %= 2400;
    }

    return entry;
  },

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
  getNow: async (user, reconnect = false) => {
    if (!user) return null;

    // load settings entity
    const settings = await Settings.findOne();

    // list of users that will act as callees
    const callees = settings.appointmentsCallees
      ? settings.appointmentsCallees
      : [];

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
        .populate('user', 'name gravatarHash')
        .exec();

    if (!doc) {
      return null;
    }

    // check if user is admin and marked as teacher
    const isCallee = user.role === 'ROLE_ADMIN' && callees.indexOf(user._id) > 0;
    // check if appointment is the one of requested user
    const isOwnAppointment = doc.user._id.toString() === user._id.toString()
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

      return doc;
    }

    return null;
  }
};

export default appointmentHelper;
