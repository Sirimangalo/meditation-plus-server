import Meditation from '../models/meditation.model.js';
import moment from 'moment-timezone';

export default {
  statsGeneral: userId => Meditation.aggregate([
    { $match: { user: userId }},
    {
      $group: {
        _id: null,
        totalWalking: { $sum: '$walking' },
        totalSitting: { $sum: '$sitting' },
        avgMeditation: { $avg: { $add: ['$walking', '$sitting']}},
        numberOfSessions: { $sum: 1 }
      }
    }
  ]),
  statsWeek: userId => Meditation.aggregate([
    {
      $match: {
        user: userId,
        createdAt: { $gte: moment().startOf('week').toDate() }
      }
    },
    {
      $group: {
        _id: { $dayOfWeek: '$createdAt' },
        totalWalking: { $sum: '$walking' },
        totalSitting: { $sum: '$sitting' },
        numberOfSessions: { $sum: 1 }
      }
    }
  ]),
  statsMonth: userId => Meditation.aggregate([
    {
      $match: {
        user: userId,
        createdAt: { $gte: moment().startOf('month').toDate() }
      }
    },
    {
      $group: {
        _id: { $dayOfMonth: '$createdAt' },
        totalWalking: { $sum: '$walking' },
        totalSitting: { $sum: '$sitting' },
        numberOfSessions: { $sum: 1 }
      }
    }
  ]),
  statsYear: async userId => await Meditation.aggregate([
    {
      $match: {
        user: userId,
        createdAt: { $gte: moment().startOf('year').toDate() }
      }
    },
    {
      $group: {
        _id: { $month: '$createdAt' },
        totalWalking: { $sum: '$walking' },
        totalSitting: { $sum: '$sitting' },
        numberOfSessions: { $sum: 1 }
      }
    }, {
      $project: {
        totalMeditating: { $add: ['$walking', '$sitting'] }
      }
    }
  ])
}
