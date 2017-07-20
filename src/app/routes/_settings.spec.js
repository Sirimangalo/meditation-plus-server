import { expect } from 'chai';
import { AuthedSupertest } from '../helper/authed-supertest.js';
import Settings from '../models/settings.model.js';

let ObjectId = require('mongoose').Types.ObjectId;
let user = new AuthedSupertest();
let admin = new AuthedSupertest(
  'Admin User',
  'admin',
  'admin@sirimangalo.org',
  'password',
  'ROLE_ADMIN'
);


describe('Settings Routes', () => {
  let settings;

  user.authorize();
  admin.authorize();

  beforeEach(done => {
    Settings.remove(() => {
      settings = new Settings({
        appointmentsIncrement: 5,
        appointmentsTicker: [
          ObjectId(123),
          ObjectId(124),
          ObjectId(125)
        ]
      });

      settings.save(err => {
        if (err) return done(err);
        done();
      });
    });
  });

  afterEach(() => {
    return Settings.remove().exec();
  });

  describe('GET /api/settings', () => {
    it('should respond with 401 when not authorized', done => {
      user
        .get('/api/settings')
        .expect(401)
        .end(err => done(err));
    });

    it('should respond with settings entity if authorized', done => {
      admin
        .get('/api/settings')
        .expect(200)
        .end((err, res) => {
          expect(res.body).to.have.property('appointmentsIncrement');
          expect(res.body.appointmentsIncrement).to.equal(5);
          expect(res.body).to.have.property('appointmentsTicker');
          expect(res.body.appointmentsTicker.length).to.equal(3);
          done(err);
        });
    });
  });

  describe('POST /api/settings', () => {
    it('should respond with 401 when not authorized', done => {
      user
        .put('/api/settings/appointmentsIncrement')
        .expect(401)
        .end(err => done(err));
    });

    it('should respond with 400 if no value is provided', done => {
      admin
        .put('/api/settings/appointmentsIncrement')
        .expect(400)
        .end(err => done(err));
    });

    it('should respond with 400 if property is invalid', done => {
      admin
        .put('/api/settings/invalid')
        .expect(400)
        .end(err => done(err));
    });

    it('should respond with 200 when trying to set \'appointmentsIncrement\'', done => {
      admin
        .put('/api/settings/appointmentsIncrement')
        .send({
          value: 10
        })
        .expect(200)
        .end(err => done(err));
    });

    it('should respond with 200 when trying to set \'appointmentsTicker\'', done => {
      admin
        .put('/api/settings/appointmentsTicker')
        .send({
          value: [ObjectId(132)]
        })
        .expect(200)
        .end(err => done(err));
    });
  });
});
