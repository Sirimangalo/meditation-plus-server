// eslint-disable-next-line no-unused-vars
import { app } from '../../server.conf.js';
import { ProfileHelper } from './profile.js';
import { expect } from 'chai';
import moment from 'moment-timezone';
import User from '../models/user.model.js';
import Meditation from '../models/meditation.model.js';
import timezone from './timezone.js';

const tzTest = [
  'UTC',
  'Eastern Standard Time',
  'US Eastern Standard Time',
  'Central Europe Standard Time',
  'W. Australia Standard Time',
  'Hawaiian Standard Time',
  'Dateline Standard Time'
];

describe('Profile Helper', () => {
  let users = {}, pHelpers = [];

  before(done => {
    User.remove(() => User
      .insertMany(tzTest.map((tz, i) => {
        return {
          username: 'username' + i,
          timezone: tz,
          local: { email: i + 'placeholder' }
        };
      }))
      .then((docs, err) => {
        if (err) return done(err);

        // fill object of example users & profile helpers by timezone
        docs.map(d => {
          users[d.timezone] = d;
          pHelpers.push(new ProfileHelper(d));
        });

        done();
      })
    );
  });

  before(done => {
    Meditation.remove(() => {
      const entries = tzTest.map(tz => {
        const dateStart1 = timezone(users[tz], moment.utc().subtract(4, 'months'));
        const dateStart2 = timezone(users[tz], moment.utc());

        return [
          // Test entries
          // ------------

          // 5 consecutive days
          { createdAt: dateStart1.toDate(), walking: 10, sitting: 10, user: users[tz]._id },
          { createdAt: dateStart1.clone().add(1, 'day').toDate(), walking: 10, sitting: 10, user: users[tz]._id },
          { createdAt: dateStart1.clone().add(2, 'days').toDate(), walking: 10, sitting: 10, user: users[tz]._id },
          { createdAt: dateStart1.clone().add(3, 'days').toDate(), walking: 10, sitting: 10, user: users[tz]._id },
          { createdAt: dateStart1.clone().add(4, 'days').toDate(), walking: 10, sitting: 10, user: users[tz]._id },

          // 3 consecutive days
          { createdAt: dateStart1.clone().add(8, 'days').toDate(), walking: 10, sitting: 10, user: users[tz]._id },
          { createdAt: dateStart1.clone().add(9, 'days').toDate(), walking: 10, sitting: 10, user: users[tz]._id },
          { createdAt: dateStart1.clone().add(10, 'days').toDate(), walking: 10, sitting: 10, user: users[tz]._id },

          // 2 consecutive days
          { createdAt: dateStart1.clone().add(13, 'days').toDate(), walking: 10, sitting: 10, user: users[tz]._id },
          { createdAt: dateStart1.clone().add(14, 'days').toDate(), walking: 10, sitting: 10, user: users[tz]._id },

          // 33 consecutive days
          { createdAt: dateStart2.toDate(), walking: 5, sitting: 5, user: users[tz]._id },
          { createdAt: dateStart2.clone().subtract(1, 'day'), walking: 5, sitting: 5, user: users[tz]._id },
          { createdAt: dateStart2.clone().subtract(2, 'days').toDate(), walking: 5, sitting: 5, user: users[tz]._id },
          { createdAt: dateStart2.clone().subtract(3, 'days').toDate(), walking: 5, sitting: 5, user: users[tz]._id },
          { createdAt: dateStart2.clone().subtract(4, 'days').toDate(), walking: 5, sitting: 5, user: users[tz]._id },
          { createdAt: dateStart2.clone().subtract(5, 'days').toDate(), walking: 5, sitting: 5, user: users[tz]._id },
          { createdAt: dateStart2.clone().subtract(6, 'days').toDate(), walking: 5, sitting: 5, user: users[tz]._id },
          { createdAt: dateStart2.clone().subtract(7, 'days').toDate(), walking: 5, sitting: 5, user: users[tz]._id },
          { createdAt: dateStart2.clone().subtract(8, 'days').toDate(), walking: 5, sitting: 5, user: users[tz]._id },
          { createdAt: dateStart2.clone().subtract(9, 'days').toDate(), walking: 5, sitting: 5, user: users[tz]._id },
          { createdAt: dateStart2.clone().subtract(10, 'days').toDate(), walking: 5, sitting: 5, user: users[tz]._id },
          { createdAt: dateStart2.clone().subtract(11, 'days').toDate(), walking: 5, sitting: 5, user: users[tz]._id },
          { createdAt: dateStart2.clone().subtract(12, 'days').toDate(), walking: 5, sitting: 5, user: users[tz]._id },
          { createdAt: dateStart2.clone().subtract(13, 'days').toDate(), walking: 5, sitting: 5, user: users[tz]._id },
          { createdAt: dateStart2.clone().subtract(14, 'days').toDate(), walking: 5, sitting: 5, user: users[tz]._id },
          { createdAt: dateStart2.clone().subtract(15, 'days').toDate(), walking: 5, sitting: 5, user: users[tz]._id },
          { createdAt: dateStart2.clone().subtract(16, 'days').toDate(), walking: 5, sitting: 5, user: users[tz]._id },
          { createdAt: dateStart2.clone().subtract(17, 'days').toDate(), walking: 5, sitting: 5, user: users[tz]._id },
          { createdAt: dateStart2.clone().subtract(18, 'days').toDate(), walking: 5, sitting: 5, user: users[tz]._id },
          { createdAt: dateStart2.clone().subtract(19, 'days').toDate(), walking: 5, sitting: 5, user: users[tz]._id },
          { createdAt: dateStart2.clone().subtract(20, 'days').toDate(), walking: 5, sitting: 5, user: users[tz]._id },
          { createdAt: dateStart2.clone().subtract(21, 'days').toDate(), walking: 5, sitting: 5, user: users[tz]._id },
          { createdAt: dateStart2.clone().subtract(22, 'days').toDate(), walking: 5, sitting: 5, user: users[tz]._id },
          { createdAt: dateStart2.clone().subtract(23, 'days').toDate(), walking: 5, sitting: 5, user: users[tz]._id },
          { createdAt: dateStart2.clone().subtract(24, 'days').toDate(), walking: 5, sitting: 5, user: users[tz]._id },
          { createdAt: dateStart2.clone().subtract(25, 'days').toDate(), walking: 5, sitting: 5, user: users[tz]._id },
          { createdAt: dateStart2.clone().subtract(26, 'days').toDate(), walking: 5, sitting: 5, user: users[tz]._id },
          { createdAt: dateStart2.clone().subtract(27, 'days').toDate(), walking: 5, sitting: 5, user: users[tz]._id },
          { createdAt: dateStart2.clone().subtract(28, 'days').toDate(), walking: 5, sitting: 5, user: users[tz]._id },
          { createdAt: dateStart2.clone().subtract(29, 'days').toDate(), walking: 5, sitting: 5, user: users[tz]._id },
          { createdAt: dateStart2.clone().subtract(30, 'days').toDate(), walking: 5, sitting: 5, user: users[tz]._id },
          { createdAt: dateStart2.clone().subtract(31, 'days').toDate(), walking: 5, sitting: 5, user: users[tz]._id },
          { createdAt: dateStart2.clone().subtract(32, 'days').toDate(), walking: 5, sitting: 5, user: users[tz]._id }
        ];
      });

      Meditation
        .insertMany([].concat.apply([], entries))
        .then((docs, err) => {
          if (err) return done(err);
          done();
        });
    });
  });

  after(() => User.remove().exec() & Meditation.remove().exec());

  it('should calculate general stats', async () => {
    for (const helper of pHelpers) {
      const res = await helper.getGeneralStats();
      expect(res).to.be.an('object');
      expect(res).to.have.property('walking');
      expect(res).to.have.property('sitting');
      expect(res).to.have.property('total');
      expect(res).to.have.property('avgSessionTime');
      expect(res).to.have.property('countOfSessions');

      expect(res['walking']).to.equal(265);
      expect(res['sitting']).to.equal(265);
      expect(res['total']).to.equal(530);
      expect(res['countOfSessions']).to.equal(43);
      expect(res['avgSessionTime'] - 12.32).to.be.lte(0.01);
    }
  });

  it('should calculate correct number of consecutive days', async () => {
    for (const helper of pHelpers) {
      const res = await helper.getConsecutiveDays();

      expect(res).to.be.an('object');
      expect(res).to.have.property('current');
      expect(res).to.have.property('total');

      expect(res['total']).to.equal(43);
      expect(res['current']).to.equal(33);
    }
  });

  it('should calculate values for week chart', async () => {
    for (const helper of pHelpers) {
      const res = await helper.getWeekChartData();
      const now = timezone(helper.user, moment.utc());

      expect(res).to.be.an('array').that.is.not.empty;
      expect(res.length).to.equal(now.isoWeekday());
      expect(res[0]).to.have.property('walking');
      expect(res[0]).to.have.property('sitting');

      expect(res[0]['walking']).to.equal(5);
      expect(res[0]['sitting']).to.equal(5);
    }
  });

  it('should calculate values for month chart', async () => {
    for (const helper of pHelpers) {
      const res = await helper.getMonthChartData();
      const now = timezone(helper.user, moment.utc());

      expect(res).to.be.an('array').that.is.not.empty;
      expect(res.length).to.equal(now.date());
      expect(res[0]).to.have.property('walking');
      expect(res[0]).to.have.property('sitting');

      expect(res[0]['walking']).to.equal(5);
      expect(res[0]['sitting']).to.equal(5);
    }
  });

  it('should calculate values for year chart', async () => {
    for (const helper of pHelpers) {
      const res = await helper.getYearChartData();

      expect(res).to.be.an('array').that.is.not.empty;
      expect(res.length).to.be.gte(2);
      expect(res.length).to.be.lte(4);

      expect(res[0]).to.have.property('walking');
      expect(res[0]).to.have.property('sitting');

      expect(res[0]['walking']).to.be.gte(5);
      expect(res[1]['sitting']).to.be.gte(5);
    }
  });

  const commitments = [
    { type: 'daily', minutes: 10 },
    { type: 'daily', minutes: 20 },
    { type: 'daily', minutes: 60 },
    { type: 'weekly', minutes: 30 },
    { type: 'weekly', minutes: 300 },
    { type: 'weekly', minutes: 500 }
  ];

  it('should calculate correct progress of daily commitments', async () => {
    const pHelper = new ProfileHelper(users['UTC']);
    expect(await pHelper.getCommitmentStatus(commitments[0])).to.equal(100);
    expect(await pHelper.getCommitmentStatus(commitments[1])).to.equal(50);
    expect(await pHelper.getCommitmentStatus(commitments[2])).to.equal(17);
  });

  it('should calculate correct progress of weekly commitments', async () => {
    const pHelper = new ProfileHelper(users['UTC']);
    expect(await pHelper.getCommitmentStatus(commitments[3])).to.equal(100);
    expect(await pHelper.getCommitmentStatus(commitments[4])).to.equal(23);
    expect(await pHelper.getCommitmentStatus(commitments[5])).to.equal(14);
  });
});
