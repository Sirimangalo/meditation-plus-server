import Meditation from '../models/meditation.model.js';
import moment from 'moment-timezone';

export default {
  statsGeneral: userId => Meditation.aggregate([
    { $match: { user: userId }},
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
  ]),
  statsWeek: (userId, tzOffset = 0) => Meditation.aggregate([
    {
      $match: {
        user: userId,
        createdAt: {
          $gte: moment().startOf('isoweek').toDate(),
          $lte: moment().toDate()
        }
      }
    },
    {
      $group: {
        _id: { $dayOfWeek: { $add: ['$createdAt', tzOffset * 60000] } },
        walking: { $sum: '$walking' },
        sitting: { $sum: '$sitting' },
        total: { $sum: { $add: ['$walking', '$sitting'] } },
        countOfSessions: { $sum: 1 }
      }
    }
  ]),
  statsMonth: (userId, tzOffset = 0) => Meditation.aggregate([
    {
      $match: {
        user: userId,
        createdAt: {
          $gte: moment().startOf('month').toDate(),
          $lte: moment().toDate()
        }
      }
    },
    {
      $group: {
        _id: { $dayOfMonth: { $add: ['$createdAt', tzOffset * 60000] } },
        walking: { $sum: '$walking' },
        sitting: { $sum: '$sitting' },
        total: { $sum: { $add: ['$walking', '$sitting'] } },
        countOfSessions: { $sum: 1 }
      }
    }
  ]),
  statsYear: async (userId, tzOffset = 0) => await Meditation.aggregate([
    {
      $match: {
        user: userId,
        createdAt: {
          $gte: moment().subtract(1, 'year').toDate(),
          $lte: moment().toDate()
        }
      }
    },
    {
      $group: {
        _id: { $month: { $add: ['$createdAt', tzOffset * 60000] } },
        walking: { $sum: '$walking' },
        sitting: { $sum: '$sitting' },
        total: { $sum: { $add: ['$walking', '$sitting'] } },
        countOfSessions: { $sum: 1 }
      }
    }
  ]),
  statsConsecutive: async (userId, tzOffset = 0) => {
    const daysMeditated = await Meditation.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: {
            $let: {
              vars: {
                createdAtTz: { $add: ['$createdAt', tzOffset * 60000] }
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

    if (daysMeditated.length < 2) return result;

    const today = new Date();
    let dayBefore = daysMeditated[0];
    let updateCurrent = today.getFullYear() === dayBefore._id.year
      && today.getMonth() + 1 === dayBefore._id.month
      && today.getDate() === dayBefore._id.day;

    for (let i = 1; i < daysMeditated.length; i++) {
      if (daysMeditated[i]._id.year === dayBefore._id.year
        && daysMeditated[i]._id.month === dayBefore._id.month
        && daysMeditated[i]._id.day + 1 === dayBefore._id.day) {
        result.total++;
        if (updateCurrent) {
          result.current++;
        } else {
          updateCurrent = false;
        }
      }

      dayBefore = daysMeditated[i];
    }

    return result;
  }
};
