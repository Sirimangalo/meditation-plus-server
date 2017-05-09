import { app } from '../../server.conf.js';
import supertest from 'supertest';
import { expect } from 'chai';
import { AuthedSupertest } from '../helper/authed-supertest.js';

const request = supertest(app);
let user = new AuthedSupertest();
let admin = new AuthedSupertest(
  'Admin User',
  'admin',
  'admin@sirimangalo.org',
  'password',
  'ROLE_ADMIN'
);

describe('Analytics Routes', () => {

  describe('GET /api/analytics-users', () => {
    user.authorize();
    admin.authorize();

    it('should respond with 401 when not authenticated', done => {
      request
        .get('/api/analytics-users')
        .expect(401)
        .end(err => done(err));
    });

    it('should respond with 401 when user has no administration privileges', done => {
      user
        .get('/api/analytics-users')
        .expect(401)
        .end(err => done(err));
    });

    it('should receive authentic data', done => {
      admin
        .get('/api/analytics-users')
        .expect(200)
        .end((err, res) => {
          expect(res.body).to.have.property('count');
          expect(res.body).to.have.property('admins');
          expect(res.body).to.have.property('suspended');
          expect(res.body).to.have.property('inactive');

          expect(res.body.count).to.be.a('number');
          expect(res.body.count).to.be.above(-1);

          expect(res.body.inactive).to.be.a('number');
          expect(res.body.inactive).to.be.above(-1);

          const similar = ['admins', 'suspended'];

          for (let key of similar) {
            const temp = res.body[key];

            expect(temp).to.be.an('array');

            if (temp.length > 0) {
              expect(temp[0]).to.have.property('name');
              expect(temp[0]).to.have.property('_id');
            }
          }

          done(err);
        });
    });
  });

  describe('GET /api/analytics-countries', () => {
    user.authorize();
    admin.authorize();

    it('should respond with 401 when not authenticated', done => {
      request
        .get('/api/analytics-countries')
        .expect(401)
        .end(err => done(err));
    });

    it('should respond with 401 when user has no administration privileges', done => {
      user
        .get('/api/analytics-countries')
        .expect(401)
        .end(err => done(err));
    });

    it('should receive authentic data', done => {
      admin
        .get('/api/analytics-countries')
        .expect(200)
        .end((err, res) => {
          expect(res.body).to.be.an('array');
          expect(res.body.indexOf(null)).to.equal(-1);

          if (res.body.length > 0) {
            const testRange = res.body.length > 10 ? 10 : res.body.length;

            for (let i = 0; i < testRange; i++) {
              const temp = res.body[i];

              expect(temp).to.have.property('_id');
              expect(temp).to.have.property('count');

              expect(temp['_id']).to.satisfy(s => { return s === null || typeof(s) === 'string'; });
              expect(temp['count']).to.be.a('number');
            }
          }

          done(err);
        });
    });
  });

  describe('GET /api/analytics-timezones', () => {
    user.authorize();
    admin.authorize();

    it('should respond with 401 when not authenticated', done => {
      request
        .get('/api/analytics-timezones')
        .expect(401)
        .end(err => done(err));
    });

    it('should respond with 401 when user has no administration privileges', done => {
      user
        .get('/api/analytics-timezones')
        .expect(401)
        .end(err => done(err));
    });

    it('should receive authentic data', done => {
      admin
        .get('/api/analytics-timezones')
        .expect(200)
        .end((err, res) => {
          expect(res.body).to.be.an('array');
          expect(res.body.indexOf(null)).to.equal(-1);
          expect(res.body.length).to.be.within(0, 10);

          if (res.body.length > 0) {
            for (let i = 0; i < res.body.length; i++) {
              const temp = res.body[i];

              expect(temp).to.have.property('_id');
              expect(temp).to.have.property('count');

              expect(temp['_id']).to.satisfy(s => { return s === null || typeof(s) === 'string'; });
              expect(temp['count']).to.be.a('number');
            }
          }

          done(err);
        });
    });
  });

  describe('GET /api/analytics-signups', () => {
    user.authorize();
    admin.authorize();

    it('should respond with 401 when not authenticated', done => {
      request
        .post('/api/analytics-signups')
        .expect(401)
        .end(err => done(err));
    });

    it('should respond with 401 when user has no administration privileges', done => {
      user
        .post('/api/analytics-signups')
        .expect(401)
        .end(err => done(err));
    });

    it('should receive authentic data without parameters', done => {
      admin
        .post('/api/analytics-signups')
        .expect(200)
        .end((err, res) => {
          expect(res.body).to.be.an('object');
          expect(res.body).to.have.property('data');
          expect(res.body).to.have.property('labels');

          expect(res.body.data.length).to.equal(res.body.labels.length);
          expect(res.body.data.length).to.equal(7);

          for (let i = 0; i < res.body.data.length; i++) {
            const tempData = res.body.data[i];
            const tempLabel = res.body.labels[i];

            expect(tempData).to.be.a('number');
            expect(tempData).to.be.above(-1);

            expect(tempLabel).to.be.a('string');
          }

          done(err);
        });
    });

    it('should receive authentic data with parameters', done => {
      admin
        .post('/api/analytics-signups')
        .send({
          // 2592E6ms = 30 days
          interval: 2592E6,
          // 12 months ago
          minDate: Date.now() - 31104E6,
          format: 'YYYY'
        })
        .expect(200)
        .end((err, res) => {
          expect(res.body).to.be.an('object');
          expect(res.body).to.have.property('data');
          expect(res.body).to.have.property('labels');

          expect(res.body.data.length).to.equal(res.body.labels.length);
          expect(res.body.data.length).to.equal(12);

          for (let i = 0; i < res.body.data.length; i++) {
            const tempData = res.body.data[i];
            const tempLabel = res.body.labels[i];

            expect(tempData).to.be.a('number');
            expect(tempData).to.be.above(-1);

            expect(tempLabel).to.be.a('string');
            expect(tempLabel).to.be.match(/^20[0-9]{2}$/);
          }

          done(err);
        });
    });
  });

  describe('GET /api/analytics-meditations', () => {
    user.authorize();
    admin.authorize();

    it('should respond with 401 when not authenticated', done => {
      request
        .post('/api/analytics-meditations')
        .expect(401)
        .end(err => done(err));
    });

    it('should respond with 401 when user has no administration privileges', done => {
      user
        .post('/api/analytics-meditations')
        .expect(401)
        .end(err => done(err));
    });

    it('should receive authentic data without parameters', done => {
      admin
        .post('/api/analytics-meditations')
        .expect(200)
        .end((err, res) => {
          expect(res.body).to.be.an('object');
          expect(res.body).to.have.property('data');
          expect(res.body).to.have.property('labels');

          expect(res.body.data.length).to.equal(res.body.labels.length);
          expect(res.body.data.length).to.equal(7);

          for (let i = 0; i < res.body.data.length; i++) {
            const tempData = res.body.data[i];
            const tempLabel = res.body.labels[i];

            expect(tempData).to.be.a('number');
            expect(tempData).to.be.above(-1);

            expect(tempLabel).to.be.a('string');
          }

          done(err);
        });
    });

    it('should receive authentic data with parameters', done => {
      admin
        .post('/api/analytics-meditations')
        .send({
          // 2592E6ms = 30 days
          interval: 2592E6,
          // 12 months ago
          minDate: Date.now() - 31104E6,
          format: 'YYYY'
        })
        .expect(200)
        .end((err, res) => {
          expect(res.body).to.be.an('object');
          expect(res.body).to.have.property('data');
          expect(res.body).to.have.property('labels');

          expect(res.body.data.length).to.equal(res.body.labels.length);
          expect(res.body.data.length).to.equal(12);

          for (let i = 0; i < res.body.data.length; i++) {
            const tempData = res.body.data[i];
            const tempLabel = res.body.labels[i];

            expect(tempData).to.be.a('number');
            expect(tempData).to.be.above(-1);

            expect(tempLabel).to.be.a('string');
            expect(tempLabel).to.be.match(/^20[0-9]{2}$/);
          }

          done(err);
        });
    });
  });

});
