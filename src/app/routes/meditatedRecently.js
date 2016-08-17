/**
* Method for checking if user has meditated recently
*/
export default (user) => {
  if (!user || !'lastMeditation' in user || !user.lastMeditation instanceof Date) {
    return false;
  }

  // calculate hours since last meditation
  let diff = Math.abs(new Date().getTime() - user.lastMeditation) / 36e5;

  // check if duration between last meditation (end) and now is not greater than 3 hours
  if (diff <= 3) {
    return true
  }

  return false;
}
