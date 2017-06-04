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

    // appointments are formatted in this timezone
    const now = moment.tz('America/Toronto');

    // load global increment for appointments
    const settings = await Settings.findOne();
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
    const isTeacher = user.role === 'ROLE_ADMIN' && user.username === 'yuttadhammo';
    // check if appointment is the one of requested user
    const isOwnAppointment = doc.user._id.toString() === user._id.toString()
    // check whether the time now is before 10 minutes after the appointment starts
    const isAppOnTime = doc.hour >= timeToNumber(now.clone().subtract(10 + 60 * increment, 'minutes'));


    if (doc && (isTeacher || isOwnAppointment && (reconnect || isAppOnTime))) {

      if (!isTeacher && !reconnect) {
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
