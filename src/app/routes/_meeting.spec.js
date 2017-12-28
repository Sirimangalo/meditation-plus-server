import { app } from '../../server.conf.js';
import supertest from 'supertest';
import { expect } from 'chai';
import { AuthedSupertest } from '../helper/authed-supertest.js';
import Meeting from '../models/meeting.model.js';
import User from '../models/user.model.js';
import Settings from '../models/settings.model.js';
import Appointment from '../models/appointment.model.js';
import AppointmentMeeting from '../models/meeting.model.js';
import moment from 'moment-timezone';
import appointHelper from '../helper/appointment.js';

const request = supertest(app);
let user = new AuthedSupertest();
let user2 = new AuthedSupertest(
  'Second User',
  'user2',
  'user2@sirimangalo.org',
  'password'
);
let admin = new AuthedSupertest(
  'Admin User',
  'admin',
  'admin@sirimangalo.org',
  'password',
  'ROLE_ADMIN'
);

describe('Meeting Routes', () => {
  let appointment, settings;

  user.authorize();
  user2.authorize();
  admin.authorize();

  before(done => {
    User.remove({
      $or: [
        { username: 'user' },
        { username: 'user2' },
        { username: 'admin' }
      ]
    }).exec().then((ok, err) =>{
      if(err) return done(err);
      done();
    });
  });

  after(done => {
    User.remove({
      $or: [
        { username: 'user' },
        { username: 'user2' },
        { username: 'admin' }
      ]
    }).exec().then((ok, err) =>{
      if(err) return done(err);
      done();
    });
  });

  before(done => {
    Settings.remove(() => Settings
      .create({
        appointmentsTimezone: 'America/Toronto'
      })
      .then((doc, err) => {
        if (err) return done(err);
        settings = doc;
        done();
      })
    );
  });

  after(done => {
    Settings.remove().exec().then((ok, err) =>{
      if(err) return done(err);
      done();
    });
  });

  before(done => {
    Appointment.remove(() => Appointment
      .create({
        user: user.user._id,
        weekDay: moment.tz('America/Toronto').weekday(),
        hour: appointHelper.timeToNumber(moment.tz('America/Toronto'))
      })
      .then((doc, err) => {
        if (err) return done(err);
        appointment = doc;
        done();
      })
    );
  });

  after(() => {
    Appointment.remove().exec().then((ok, err) =>{
      if(err) return done(err);
      done();
    });
  });

  describe('GET /api/meeting', () => {
    it('should do pagination', () => {});
  });
  describe('GET /api/meeting/appointment', () => {});
  describe('GET /api/meeting/now', () => {
    let meeting;

    admin.authorize();
    user.authorize();
    user2.authorize();

    it('should respond with 400 if user has no appointment', done => {
      user2
        .get('/api/meeting/now')
        .expect(400)
        .end(err => done(err));
    });

    it('should respond with meeting if a valid user requests', done => {
      user
        .get('/api/meeting/now')
        .expect(200)
        .end((err, res) => {
          expect(res.body).to.have.property('appointment');
          expect(res.body.appointment._id.toString()).to.equal(appointment._id.toString());
          expect(res.body.appointment.user.toString()).to.equal(appointment.user.toString());
          expect(res.body).to.have.property('participants');
          expect(res.body.participants[0]._id.toString()).to.equal(user.user._id.toString());
          done(err);
        });
    });

    it('should respond with the same meeting if requested again', done => {
      user
        .get('/api/meeting/now')
        .expect(200)
        .end((err, res) => {
          expect(res.body._id).to.equal(meeting._id);
          done(err);
        });
    });

    it('should respond with meeting object if user is admin');
    it('should respond with meeting object at tolerated times');
  });
  describe('POST /api/meeting/join', () => {});
  describe('POST /api/meeting/message', () => {
    it('should respond with 400 if user has no meeting', done => {
      user2
        .post('/api/meeting/message')
        .send({
          messageText: 'Test'
        })
        .expect(400)
        .end(err => done(err));
    });

    it('should respond with 200 if user in meeting', () => {
      user
        .post('/api/meeting/message')
        .send({
          messageText: 'Test'
        })
        .expect(400)
        .end((err, res) => {
          if (err) return done(err);

          expect(res.body).to.have.property('user');
          expect(res.body).to.have.property('text');
          expect(res.body).to.have.property('private');
          expect(res.body.private).to.equal(true);
          expect(res.body.text).to.equal('Test');
          expect(res.body.user).to.have.property('_id');
          expect(res.body.user).to.have.property('name');
          expect(res.body.user).to.have.property('username');
          expect(res.body.user).to.have.property('country');

          done();
        });
    })
  });


});
