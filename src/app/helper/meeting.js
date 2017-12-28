import Meeting from '../models/meeting.model.js';
import moment from 'moment';

export default {

  /**
   * Gets an ongoing meeting
   */
  getOngoing: () => Meeting
    .findOne({
      closedAt: { $exists: false },
      createdAt: { $gt: moment().subtract(25, 'minutes') }
    })
    .populate('messages')
    .populate('appointment')
    .populate('participants', 'name username gravatarHash country'),

  /**
   * Gets an ongoing meeting for a given user
   */
  getOngoingByUser: user => Meeting
    .findOne({
      participants: user._id,
      closedAt: { $exists: false },
      createdAt: { $gt: moment().subtract(25, 'minutes') }
    })
    .populate('messages')
    .populate('appointment')
    .populate('participants', 'name username gravatarHash country'),

  /**
   * Gets an ongoing meeting and adds a given user to it.
   * In case of non-existance a new meeting is created.
   */
  getOngoingOrCreate: (appointment, user) => Meeting
    .findOneAndUpdate({
      appointment: appointment._id,
      closedAt: { $exists: false },
      createdAt: { $gt: moment().subtract(25, 'minutes') }
    }, {
      $addToSet: {
        participants: user._id
      },
      appointment: appointment._id
    }, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true
    })
    .populate('appointment')
    .populate('messages')
    .populate('participants', 'name username gravatarHash country')
};
