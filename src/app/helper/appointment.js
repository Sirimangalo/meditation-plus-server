const appointmentHelper = {
  /**
   * Parses hour as String.
   *
   * @param  {Number} hour Number representing time
   * @return {String}      'HH:mm' formatted time
   */
  parseHour: hour => {
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
      // change day to next day if positive hour
      entry.weekDay = (entry.weekDay + 1) % 7;
      entry.hour %= 2400;
    }

    return entry;
  }
};

export default appointmentHelper;
