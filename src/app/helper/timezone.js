import moment from 'moment-timezone';
const timezones = require('timezones.json');

/**
* Method for converting times to user's timezone
*/
export default (user, time) => {
  if (!user.timezone) {
    return moment(time).utc();
  }

  const detectedTz = timezones
    .filter(tz => tz.value === user.timezone)
    .reduce(tz => tz);

  if (!detectedTz) {
    return moment(time).utc();
  }

  return moment(time).utc().utcOffset(detectedTz.offset);
};
