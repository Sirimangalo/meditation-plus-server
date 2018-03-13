import { app } from '../../server.conf.js';
import supertest from 'supertest';
import { expect } from 'chai';
import { AuthedSupertest } from '../helper/authed-supertest.js';
import Meeting from '../models/meeting.model.js';
import User from '../models/user.model.js';
import Settings from '../models/settings.model.js';
import Appointment from '../models/appointment.model.js';
import moment from 'moment-timezone';
import timekeeper from 'timekeeper';

const request = supertest(app);
let alice = new AuthedSupertest();
let mallory = new AuthedSupertest(
  'Mallory',
  'mallory',
  'mallory@sirimangalo.org',
  '4a56s4d6a5s4d6a5sd'
);
let teacher = new AuthedSupertest(
  'Admin User',
  'admin',
  'admin@sirimangalo.org',
  'password',
  'ROLE_ADMIN',
  true
);

describe('Meeting Routes', () => {
  // eslint-disable-next-line no-unused-vars
  let appointment, settings, meeting;

  teacher.authorize();
  alice.authorize();
  mallory.authorize();

  before(async () => {
    await Appointment.remove();
    await Settings.remove();
    await Meeting.remove();

    settings = await Settings.create({
      appointmentsTimezone: 'UTC'
    });

    appointment = await Appointment.create({
      user: alice.user._id,
      weekDay: 6,
      hour: 1400
    });
  });

  after(async () => {
    await User.remove();
    await Appointment.remove();
    await Settings.remove();
    await Meeting.remove();
    timekeeper.reset();
  });

  describe('GET /api/meeting', () => {
    timekeeper.travel(moment.tz('2018-03-10 10:00:00', 'UTC').toDate());

    it('should respond with 401 when not authenticated', done => {
      request
        .get('/api/meeting')
        .expect(401)
        .end(err => done(err));
    });

    it('should respond with 400 if user has no appointment', done => {
      timekeeper.travel(moment.tz('2018-03-10 14:00:00', 'UTC').toDate());
      mallory
        .get('/api/meeting')
        .expect(400)
        .end(err => done(err));
    });

    it('should respond with 400 if user is too early', done => {
      timekeeper.travel(moment.tz('2018-03-10 13:54:55', 'UTC').toDate());
      mallory
        .get('/api/meeting')
        .expect(400)
        .end(err => done(err));
    });

    it('should respond with 400 if user is too late', done => {
      timekeeper.travel(moment.tz('2018-03-10 14:05:10', 'UTC').toDate());
      mallory
        .get('/api/meeting')
        .expect(400)
        .end(err => done(err));
    });

    it('should respond with 400 for admin if no meeting/appointment exists', done => {
      timekeeper.travel(moment.tz('2018-03-10 14:00:00', 'UTC').toDate());
      teacher
        .get('/api/meeting')
        .expect(400)
        .end(err => done(err));
    });

    it('should respond with 200 and the meeting if appointment holder requests in time', done => {
      timekeeper.travel(moment.tz('2018-03-10 14:00:00', 'UTC').toDate());
      alice
        .get('/api/meeting')
        .expect(200)
        .end((err, res) => {
          expect(res.body).to.have.property('participants');
          expect(res.body.participants.length).to.equal(1);
          expect(res.body.participants[0]._id.toString()).to.equal(alice.user._id.toString());

          meeting = res.body;

          done(err);
        });
    });

    it('should respond with 200 and the same meeting if requested again later', done => {
      timekeeper.travel(moment.tz('2018-03-10 14:20:00', 'UTC').toDate());
      alice
        .get('/api/meeting')
        .expect(200)
        .end((err, res) => {
          expect(res.body._id).to.equal(meeting._id);
          expect(res.body.participants.length).to.equal(1);
          done(err);
        });
    });

    it('should respond with 400 if other user tries to request now', done => {
      timekeeper.travel(moment.tz('2018-03-10 14:08:00', 'UTC').toDate());
      mallory
        .get('/api/meeting')
        .expect(400)
        .end(err => done(err));
    });

    it('should respond with 400 and the meeting if teacher requests', done => {
      timekeeper.travel(moment.tz('2018-03-10 14:09:00', 'UTC').toDate());
      teacher
        .get('/api/meeting')
        .expect(200)
        .end((err, res) => {
          expect(res.body._id).to.equal(meeting._id);
          expect(res.body.participants.length).to.equal(2);
          expect(res.body.participants[1]._id).to.equal(teacher.user._id.toString());
          done(err);
        });
    });
  });

  describe('POST /api/meeting/message', () => {
    it('should respond with 401 when not authenticated', done => {
      request
        .get('/api/meeting/message')
        .expect(401)
        .end(err => done(err));
    });

    it('should respond with 400 if user provides no meeting id', done => {
      timekeeper.travel(moment.tz('2018-03-10 14:12:00', 'UTC').toDate());
      alice
        .post('/api/meeting/message')
        .send({
          text: 'Test'
        })
        .expect(400)
        .end(err => done(err));
    });

    it('should respond with 400 if user has no meeting', done => {
      timekeeper.travel(moment.tz('2018-03-10 14:12:00', 'UTC').toDate());
      mallory
        .post('/api/meeting/message')
        .send({
          meetingId: meeting._id,
          text: 'Test'
        })
        .expect(400)
        .end(err => done(err));
    });

    it('should respond with 204 if user in meeting (1)', done => {
      timekeeper.travel(moment.tz('2018-03-10 14:13:00', 'UTC').toDate());
      alice
        .post('/api/meeting/message')
        .send({
          meetingId: meeting._id,
          text: 'Test'
        })
        .expect(204)
        .end(err => {
          if (err) return done(err);

          Meeting
            .findOne({
              _id: meeting._id
            })
            .populate('messages')
            .then(doc => {
              expect(doc.messages.length).to.equal(1);
              expect(doc.messages[0].text).to.equal('Test');
              expect(doc.messages[0].user.toString()).to.equal(alice.user._id.toString());

              done();
            });
        });
    });

    it('should respond with 204 if user in meeting (2)', done => {
      teacher
        .post('/api/meeting/message')
        .send({
          meetingId: meeting._id,
          text: 'pi=3'
        })
        .expect(204)
        .end(err => {
          if (err) return done(err);

          Meeting
            .findOne({
              _id: meeting._id
            })
            .populate('messages')
            .then(doc => {
              expect(doc.messages.length).to.equal(2);
              expect(doc.messages[0].text).to.equal('Test');
              expect(doc.messages[0].private).to.equal(true);
              expect(doc.messages[0].user.toString()).to.equal(alice.user._id.toString());
              expect(doc.messages[1].text).to.equal('pi=3');
              expect(doc.messages[1].private).to.equal(true);
              expect(doc.messages[1].user.toString()).to.equal(teacher.user._id.toString());

              done();
            });
        });
    });
  });

  describe('POST /api/meeting/close', () => {
    it('should respond with 401 when not authenticated', done => {
      request
        .get('/api/meeting/message')
        .expect(401)
        .end(err => done(err));
    });

    it('should respond with 401 if user is no admin', done => {
      timekeeper.travel(moment.tz('2018-03-10 14:18:00', 'UTC').toDate());
      alice
        .post('/api/meeting/close')
        .send({
          meetingId: meeting._id
        })
        .expect(401)
        .end(err => done(err));
    });

    it('should respond with 400 if teacher provides no meeting id', done => {
      timekeeper.travel(moment.tz('2018-03-10 14:18:00', 'UTC').toDate());
      teacher
        .post('/api/meeting/close')
        .send()
        .expect(400)
        .end(err => done(err));
    });

    it('should respond with 400 if teacher provides invalid meeting id', done => {
      timekeeper.travel(moment.tz('2018-03-10 14:18:00', 'UTC').toDate());
      teacher
        .post('/api/meeting/close')
        .send({
          meetingId: '1230000000000000000000'
        })
        .expect(400)
        .end(err => done(err));
    });

    it('should respond with 204 if teacher requests at valid time', done => {
      timekeeper.travel(moment.tz('2018-03-10 14:18:00', 'UTC').toDate());
      teacher
        .post('/api/meeting/close')
        .send({
          meetingId: meeting._id
        })
        .expect(204)
        .end(err => {
          if (err) return done(err);

          Meeting
            .findOne({
              _id: meeting._id,
              closedAt: { $exists: true }
            })
            .then(doc => {
              expect(doc).to.not.equal(null);
              expect(doc._id.toString()).to.equal(meeting._id.toString());

              done();
            });
        });
    });

    it('should should not allow message sending after closing', done => {
      timekeeper.travel(moment.tz('2018-03-10 14:20:00', 'UTC').toDate());
      alice
        .post('/api/meeting/message')
        .send({
          meetingId: meeting._id,
          text: 'Test'
        })
        .expect(400)
        .end(err => done(err));
    });

    it('should disallow user to get meeting after it has been closed (1)', done => {
      timekeeper.travel(moment.tz('2018-03-10 14:20:00', 'UTC').toDate());
      alice
        .get('/api/meeting')
        .send()
        .expect(400)
        .end(err => done(err));
    });

    it('should disallow user to get meeting after it has been closed (2)', done => {
      timekeeper.travel(moment.tz('2018-03-10 14:30:00', 'UTC').toDate());
      alice
        .get('/api/meeting')
        .send()
        .expect(400)
        .end(err => done(err));
    });
  });

  describe('GET /api/meeting/history', () => {
    it('should respond with 401 when not authenticated', done => {
      request
        .get('/api/meeting/history')
        .expect(401)
        .end(err => done(err));
    });

    it('should respond with empty set if user has no meetings', done => {
      timekeeper.travel(moment.tz('2018-03-10 14:25:00', 'UTC').toDate());
      mallory
        .get('/api/meeting/history')
        .expect(200)
        .end((err, res) => {
          if (err) done(err);

          expect(res.body).to.have.property('meetings');
          expect(res.body).to.have.property('length');

          expect(res.body.meetings.length).to.equal(0);
          expect(res.body.length).to.equal(0);

          done();
        });
    });

    it('should respond with list of meetings if user has meetings', done => {
      timekeeper.travel(moment.tz('2018-03-10 14:25:00', 'UTC').toDate());
      alice
        .get('/api/meeting/history')
        .expect(200)
        .end((err, res) => {
          if (err) done(err);

          expect(res.body).to.have.property('meetings');
          expect(res.body).to.have.property('length');

          expect(res.body.length).to.equal(1);
          expect(res.body.meetings.length).to.equal(1);
          expect(res.body.meetings[0]._id.toString()).to.equal(meeting._id.toString());
          expect(res.body.meetings[0].participants.length).to.equal(2);
          expect(res.body.meetings[0].participants[0]._id.toString()).to.equal(alice.user._id.toString());
          expect(res.body.meetings[0].messages.length).to.equal(2);
          expect(res.body.meetings[0].messages.length).to.equal(2);

          done();
        });
    });
  });


});
