import Meditation from '../models/meditation.model.js';
import User from '../models/user.model.js';
import moment from 'moment-timezone';
import timezone from './timezone.js';

export class ProfileHelper {

  user: User;
  utcOffset = 0;

  constructor(user) {
    this.user = user;
    this.utcOffset = timezone(this.user, 0).utcOffset();
  }

  /**
   * Calculate general, non time-specific statistic
   * for a certain user.
   *
   * @param  {User}   user   Valid user
   * @return {Object}        General profile stats
   */
  async getGeneralStats() {
    const defaultValues = {
      _id: null,
      walking: 0,
      sitting: 0,
      total: 0,
      avgSessionTime: 0,
      countOfSessions: 0
    };

    const data = await Meditation.aggregate([
      { $match: { user: this.user._id } },
      {
        $group: {
          _id: null,
          walking: { $sum: '$walking' },
          sitting: { $sum: '$sitting' },
          total: { $sum: { $add: ['$walking', '$sitting'] } },
          avgSessionTime: { $avg: { $add: ['$walking', '$sitting'] } },
          countOfSessions: { $sum: 1 }
        }
      }
    ]);

    return data && data.length > 0 ? data[0] : defaultValues;
  }

  /**
   * Calculate profile data for the current week (since last monday).
   *
   * @param  {User}   user   Valid user
   * @return {Object}        Profile stats for this week
   */
  async getWeekChartData() {
    return Meditation.aggregate([
      {
        $match: {
          user: this.user._id,
          createdAt: {
            $gte: timezone(this.user, moment.utc().startOf('isoweek')).toDate()
          }
        }
      },
      {
        $group: {
          _id: { $dayOfWeek: { $add: ['$createdAt', this.utcOffset * 60000] } },
          walking: { $sum: '$walking' },
          sitting: { $sum: '$sitting' }
        }
      }
    ]);
  }

  /**
   * Calculate profile data for the current month (since first day in month).
   *
   * @param  {User}   user   Valid user
   * @return {Object}        Profile stats for this month
   */
  async getMonthChartData() {
    return Meditation.aggregate([
      {
        $match: {
          user: this.user._id,
          createdAt: {
            $gte: timezone(this.user, moment().startOf('month')).toDate(),
          }
        }
      },
      {
        $group: {
          _id: { $dayOfMonth: { $add: ['$createdAt', this.utcOffset * 60000] } },
          walking: { $sum: '$walking' },
          sitting: { $sum: '$sitting' }
        }
      }
    ]);
  }

  /**
   * Calculate profile data for the past year.
   *
   * @param  {User}   user   Valid user
   * @return {Object}        Profile stats for past year
   */
  async getYearChartData() {
    return Meditation.aggregate([
      {
        $match: {
          user: this.user._id,
          createdAt: {
            $gte: timezone(this.user, moment().subtract(1, 'year')).toDate()
          }
        }
      },
      {
        $group: {
          _id: { $month: { $add: ['$createdAt', this.utcOffset * 60000] } },
          walking: { $sum: '$walking' },
          sitting: { $sum: '$sitting' }
        }
      }
    ]);
  }

  /**
   * Helper function for returning an object containing data from
   * all three methods (week, month, year).
   *
   * @param  {User}   user   Valid user
   * @return {Object}        Chart data
   */
  async getChartData() {
    return {
      week: await this.getWeekChartData(),
      month: await this.getMonthChartData(),
      year: await this.getYearChartData()
    };
  }

  /**
   * Get number of total and current consecutive days of meditation.
   *
   * @param  {User}   user Valid user
   * @return {Object}      Object containing both values
   */
  async getConsecutiveDays() {
    const daysMeditated = await Meditation.aggregate([
      { $match: { user: this.user._id } },
      {
        $group: {
          _id: {
            $let: {
              vars: {
                createdAtTz: { $add: ['$createdAt', this.utcOffset * 60000] }
              },
              in: {
                year: { $year: '$$createdAtTz' },
                month: { $month: '$$createdAtTz' },
                day: { $dayOfMonth: '$$createdAtTz' }
              }
            }
          }
        }
      },
      {
        $sort: {
          '_id.year': -1,
          '_id.month': -1,
          '_id.day': -1
        }
      },
    ]);

    const result = {
      current: 0,
      total: 0
    };

    // no consecutive days
    if (daysMeditated.length < 2) return result;

    // necessary helper function to deal with aggregation
    // data structure
    const toMoment = obj => moment
      .utc()
      .year(obj._id.year)
      .month(obj._id.month - 1 === -1 ? 11 : obj._id.month - 1)
      .date(obj._id.day);

    let dayBefore = toMoment(daysMeditated[0]);
    let flagUpdateCurrent = true;
    let flagConsecutive = false;

    for (let i = 1; i < daysMeditated.length; i++) {
      const currentDay = toMoment(daysMeditated[i]);
      if (dayBefore.diff(currentDay, 'days') <= 1) {
        // add two if first item in a series of consecutive days
        // to not miss the first day. ref: https://meta.stackexchange.com/a/104624
        result.total += !flagConsecutive ? 2 : 1;

        if (flagUpdateCurrent) {
          result.current += !flagConsecutive ? 2 : 1;
        }

        flagConsecutive = true;
      } else {
        flagUpdateCurrent = false;
        flagConsecutive = false;
      }

      dayBefore = currentDay;
    }

    return result;
  }
}
