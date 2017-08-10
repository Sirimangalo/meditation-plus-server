import Meditation from '../models/meditation.model.js';
import timezone from '../helper/timezone.js';
import moment from 'moment';

export class ProfileHelper {
  async calculateStats(user) {
    const timespans = this.initializeTimespans(user);
    let meditations = {
      lastMonths: {},
      lastWeeks: {},
      lastDays: {},
      consecutiveDays: [],
      numberOfSessions: 0,
      currentConsecutiveDays: 0,
      totalMeditationTime: 0,
      averageSessionTime: 0,
      timespan: {
        lastDay: null,
        ...timespans
      }
    };

    meditations = this.fillTimespan(meditations);

    // sum meditation time
    const result = await this.getMeditationsToDateForUser(
      meditations.timespan.today, user
    );
    meditations = result.reduce(
      (prev, cur) => this.processEntry(prev, cur, user),
      meditations
    );

    meditations.averageSessionTime =
      Math.round(meditations.totalMeditationTime / meditations.numberOfSessions);

    delete meditations.timespan;
    return meditations;
  }

  initializeTimespans(user) {
    let today = timezone(user, moment());
    let todayWithoutTime = timezone(user, moment()).startOf('day');
    let tenDaysAgo = moment(todayWithoutTime).subtract(9, 'days');
    let tenWeeksAgo = moment(todayWithoutTime).subtract(9, 'weeks');
    let tenMonthsAgo = moment(todayWithoutTime).subtract(9, 'months');

    return {
      today, todayWithoutTime, tenDaysAgo, tenWeeksAgo, tenMonthsAgo
    };
  }

  async getMeditationsToDateForUser(date, user) {
    return await Meditation
      .find({
        end: { $lt: date.format('x') },
        user: user._id
      })
      .sort([['createdAt', 'ascending']])
      .lean()
      .exec();
  }

  fillTimespan(meditations) {
    // iterate days
    for (let day = moment(meditations.timespan.tenMonthsAgo);
      day <= meditations.timespan.todayWithoutTime;
      day.add(1, 'day')
    ) {
      meditations = this.setTimespanValue(meditations, day, 0);
    }

    return meditations;
  }

  setTimespanValue(meditations, date, value, add = false) {
    const ts = meditations.timespan;

    // adding times of last 10 months
    meditations.lastMonths[date.format('MMM YY')] =
      this.setValue(meditations.lastMonths[date.format('MMM YY')], value, add);

    // adding times of last 10 weeks
    if (date >= ts.tenWeeksAgo) {
      meditations.lastWeeks[date.format('YY-w')] =
        this.setValue(meditations.lastWeeks[date.format('YY-w')], value, add);
    }

    // adding times of last 10 days
    if (date >= ts.tenDaysAgo) {
      meditations.lastDays[date.format('Do')] =
        this.setValue(meditations.lastDays[date.format('Do')], value, add);
    }

    return meditations;
  }

  setValue(variable, value, add = false) {
    if (add) return variable += value;
    else return variable = value;
  }

  getStartOfDuration(firstDate, lastDate) {
    return moment.duration(
      moment(firstDate).startOf('day').diff(moment(lastDate).startOf('day'))
    );
  }

  tenDaysBadge(meditations) {
    // save 10-steps as badges
    if (meditations.currentConsecutiveDays > 0 && meditations.currentConsecutiveDays % 10 === 0) {
      meditations.consecutiveDays.push(meditations.currentConsecutiveDays);
    }

    return meditations;
  }

  calculateConsecutiveDays(meditations, date) {
    // calculate consecutive days
    if (meditations.lastDay) {
      const duration = this.getStartOfDuration(date, meditations.lastDay);

      // only one day ago = consecutive day
      if (duration.asDays() === 1) {
        meditations.currentConsecutiveDays =
          meditations.currentConsecutiveDays == 0
            ? 2
            : meditations.currentConsecutiveDays + 1;

        meditations = this.tenDaysBadge(meditations);
      } else if (duration.asDays() > 1) {
        // more than one day ago = reset consecutive days
        meditations.currentConsecutiveDays = 0;
      }
    } else {
      meditations.currentConsecutiveDays = 0;
    }

    return meditations;
  }

  processEntry(previous, entry, user) {
    const value = entry.sitting + entry.walking;

    previous.numberOfSessions++;
    previous.totalMeditationTime += value;
    const entryDate = timezone(user, entry.createdAt);

    previous = this.setTimespanValue(previous, entryDate, value, true);
    previous = this.calculateConsecutiveDays(previous, entryDate);
    previous.lastDay = entryDate;

    return previous;
  }
}
