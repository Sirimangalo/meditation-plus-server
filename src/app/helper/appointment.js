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
  let res = 0;

  if (time instanceof Date) {
    res = time.getHours() * 100 + time.getMinutes();
  } else if (time instanceof moment) {
    res = time.hours() * 100 + time.minutes();
  }

  return res;
}

const appointmentHelper = {

  /**
   * Searches for appointments the user is allowed to
   * join right now. For regular users this means at
   * the time of their booked appointment (with a 5 minute
   * tolerance). For admins marked as teacher, it means
   * 5 minutes before the appointment starts or 25 minutes
   * after the appointment was scheduled.
   *
   * @param  {Object}  user      User that needs authorization
   * @param  {Boolean} reconnect If set to true it doesn't check
   *                             the time for regular users
   * @return                     the appointment object or false
   */
  getNow: async (user, reconnect = false) => {
    if (!user) return null;

    const now = moment.tz('America/Toronto');
    const doc = await Appointment
        .findOne({
          weekDay: now.weekday(),
          hour: {
            $lte: timeToNumber(now.clone().add(5, 'minutes')),
            $gte: timeToNumber(now.clone().subtract(25, 'minutes'))
          },
          user: { $exists: true, $ne: null }
        })
        .populate('user', 'name gravatarHash')
        .exec();


    const isAnswerer = user.role === 'ROLE_ADMIN' && appointmentHelper.answerer.indexOf(user.username) > -1;

    if (doc && (isAnswerer || doc.user._id.toString() === user._id &&
      (reconnect || doc.hour >= timeToNumber(now.clone().subtract(5, 'minutes'))))) {

      if (!isAnswerer && !reconnect) {
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

      const settings = await Settings.findOne();

      // apply universal increment to appointment
      if (settings && settings.appointmentIncrement) {
        doc.hour += settings.appointmentIncrement;
      }

      return doc;
    }

    return null;
  },

  answerer: ['yuttadhammo']
};

export default appointmentHelper;
