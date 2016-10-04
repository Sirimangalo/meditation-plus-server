import { app } from '../../server.conf.js';
import supertest from 'supertest';
import { expect } from 'chai';
import { AuthedSupertest } from '../helper/authed-supertest.js';
import Appointment from '../models/appointment.model.js';

const request = supertest(app);
let user = new AuthedSupertest();
let user2 = new AuthedSupertest(
  'Second User',
  'user2@sirimangalo.org',
  'password'
);
let admin = new AuthedSupertest(
  'Admin User',
  'admin@sirimangalo.org',
  'password',
  'ROLE_ADMIN'
);

describe('Appointment Routes', () => {
  let appointment;

  beforeEach(done => {
    Appointment.remove(() => {
      appointment = new Appointment({
        weekDay: 1,
        hour: 12
      });

      appointment.save(err => {
        if (err) return done(err);
        done();
      });
    });
  });

  afterEach(() => {
    return Appointment.remove().exec();
  });

  describe('GET /api/appointment', () => {
    user.authorize();

    it('should respond with 401 when not authenticated', done => {
      request
        .get('/api/appointment')
        .expect(401)
        .end(err => done(err));
    });

    it('should respond with data when authenticated', done => {
      user
        .get('/api/appointment')
        .expect(200)
        .end((err, res) => {
          expect(res.body).to.have.property('hours');
          expect(res.body).to.have.property('appointments');
          expect(res.body.hours.length).to.equal(1);
          expect(res.body.appointments.length).to.equal(1);
          expect(res.body.hours[0]).to.equal(12);
          expect(res.body.appointments[0].weekDay).to.equal(1);
          done(err);
        });
    });

    it('should respond with more data when added', done => {
      Appointment.create({
        weekDay: 2,
        hour: 13
      }).then((res, err) => {
        if (err) return done(err);

        user
          .get('/api/appointment')
          .expect(200)
          .end((err, res) => {
            expect(res.body).to.have.property('hours');
            expect(res.body).to.have.property('appointments');
            expect(res.body.hours.length).to.equal(2);
            expect(res.body.appointments.length).to.equal(2);
            done(err);
          });
      });
    });

    it('should only add hours once', done => {
      Appointment.create({
        weekDay: 1,
        hour: 12
      }).then((res, err) => {
        if (err) return done(err);

        user
          .get('/api/appointment')
          .expect(200)
          .end((err, res) => {
            expect(res.body).to.have.property('hours');
            expect(res.body).to.have.property('appointments');
            expect(res.body.hours.length).to.equal(1);
            expect(res.body.appointments.length).to.equal(2);
            done(err);
          });
      });
    });
  });

  describe('POST /api/appointment/:id/register', () => {
    user.authorize();
    user2.authorize();

    it('should respond with 401 when not authenticated', done => {
      request
        .post(`/api/appointment/${appointment._id}/register`)
        .expect(401)
        .end(err => done(err));
    });

    it('should respond with 204 on success', done => {
      user
        .post(`/api/appointment/${appointment._id}/register`)
        .expect(204)
        .end(err => {
          if (err) return done(err);
          // deregistration should work, too
          user
            .post(`/api/appointment/${appointment._id}/register`)
            .expect(204)
            .end(err => done(err));
        });
    });

    it('should respond with 400 when already taken', done => {
      user
        .post(`/api/appointment/${appointment._id}/register`)
        .expect(204)
        .end(err => {
          if (err) return done(err);

          // registration of second user should not work
          user2
            .post(`/api/appointment/${appointment._id}/register`)
            .expect(400)
            .end(err => done(err));
        });
    });
  });

  describe('GET /api/appointment/:id', () => {
    user.authorize();
    admin.authorize();

    it('should respond with 401 when not authenticated', done => {
      request
        .get(`/api/appointment/${appointment._id}`)
        .expect(401)
        .end(err => done(err));
    });

    it('should respond with 401 when authenticated as user', done => {
      user
        .get(`/api/appointment/${appointment._id}`)
        .expect(401)
        .end(err => done(err));
    });

    it('should correctly return when authenticated as admin', done => {
      admin
        .get(`/api/appointment/${appointment._id}`)
        .expect(200)
        .end((err, res) => {
          expect(res.body._id).to.equal(appointment._id.toString());
          done(err);
        });
    });
  });

  describe('PUT /api/appointment/:id', () => {
    user.authorize();
    admin.authorize();

    it('should respond with 401 when not authenticated', done => {
      request
        .put(`/api/appointment/${appointment._id}`)
        .send({
          weekDay: 0
        })
        .expect(401)
        .end(err => done(err));
    });

    it('should respond with 401 when authenticated as user', done => {
      user
        .put(`/api/appointment/${appointment._id}`)
        .send({
          weekDay: 0
        })
        .expect(401)
        .end(err => done(err));
    });

    it('should correctly return when authenticated as admin', done => {
      admin
        .put(`/api/appointment/${appointment._id}`)
        .send({
          weekDay: 0
        })
        .expect(200)
        .end(err => done(err));
    });
  });

  describe('POST /api/appointment', () => {
    user.authorize();
    admin.authorize();

    it('should respond with 401 when not authenticated', done => {
      request
        .post('/api/appointment')
        .send({
          weekDay: 0
        })
        .expect(401)
        .end(err => done(err));
    });

    it('should respond with 401 when authenticated as user', done => {
      user
        .post('/api/appointment')
        .send({
          weekDay: 0
        })
        .expect(401)
        .end(err => done(err));
    });

    it('should correctly return when authenticated as admin', done => {
      admin
        .post('/api/appointment')
        .send({
          hour: 0,
          weekDay: 0
        })
        .expect(201)
        .end(err => done(err));
    });
  });

  describe('DELETE /api/appointment/:id', () => {
    user.authorize();
    admin.authorize();

    it('should respond with 401 when not authenticated', done => {
      request
        .delete(`/api/appointment/${appointment._id}`)
        .expect(401)
        .end(err => done(err));
    });

    it('should respond with 401 when authenticated as user', done => {
      user
        .delete(`/api/appointment/${appointment._id}`)
        .expect(401)
        .end(err => done(err));
    });

    it('should correctly delete when authenticated as admin', done => {
      admin
        .delete(`/api/appointment/${appointment._id}`)
        .expect(200)
        .end(err => {
          if (err) return done(err);

          // check if really deleted
          admin
            .get(`/api/appointment/${appointment._id}`)
            .expect(404)
            .end(err => done(err));
        });
    });
  });

  describe('DELETE /api/appointment/remove/:id', () => {
    user.authorize();
    admin.authorize();

    it('should respond with 401 when not authenticated', done => {
      request
        .delete(`/api/appointment/remove/${appointment._id}`)
        .expect(401)
        .end(err => done(err));
    });

    it('should respond with 401 when authenticated as user', done => {
      user
        .delete(`/api/appointment/remove/${appointment._id}`)
        .expect(401)
        .end(err => done(err));
    });

    it('should correctly delete when authenticated as admin', done => {
      admin
        .delete(`/api/appointment/remove/${appointment._id}`)
        .expect(200)
        .end(err => {
          if (err) return done(err);

          // check if really deleted
          admin
            .get(`/api/appointment/${appointment._id}`)
            .expect(200)
            .end((err, res) => {
              expect(res.body.user).to.equal(null);
              done(err);
            });
        });
    });
  });
});
