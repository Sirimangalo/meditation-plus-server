import { app } from '../../server.conf.js';
import supertest from 'supertest';
import { expect } from 'chai';
import { AuthedSupertest } from '../helper/authed-supertest.js';
import Settings from '../models/settings.model.js';

const request = supertest(app);
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
        appointmentsIncrement: 5
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

    it('should respond with 200 if request is valid', done => {
      admin
        .put('/api/settings/appointmentsIncrement')
        .send({
          value: 10
        })
        .expect(200)
        .end(err => done(err));
    });
  });
});
