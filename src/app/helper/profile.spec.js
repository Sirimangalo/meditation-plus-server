import profileHelper from './profile.js';
import { expect } from 'chai';
import moment from 'moment-timezone';
import { _ } from 'lodash';
import User from '../models/user.model.js';
import Meditation from '../models/meditation.model.js';
const ObjectId = require('mongoose').Types.ObjectId;
const utcUser = ObjectId(123456789);
const cetUser = ObjectId(123456798);

describe('ProfileHelper', () => {
  let user;

  before(done => User
    .insertMany([
      { _id: utcUser, timezone: 'UTC' },
      { _id: cetUser, timezone: 'CET' }
    ], err => {
      if (err) return done(err);
      done();
    })
  );

  describe('General Stats', () => {

  });

  describe('Chart Data', () => {});

  describe('Consecutive Days', () => {
    before(done => Meditation
      .insertMany([
        { _id: ObjectId(1), createdAt: moment.utc(0), walking: 10, sitting: 10, user: utcUser }
      ], (err, docs) => {
        console.log('HERE');
        if (err) return done(err);
        done();
      })
    );

    it('should calculate correct number of total days');
    it('should not set "current" if not meditated yesterday');
    it('should respect timezone of user');
  });
});
