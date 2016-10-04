import { app } from '../../server.conf.js';
import supertest from 'supertest';
import { expect } from 'chai';
import User from '../models/user.model.js';
import { AuthedSupertest } from '../helper/authed-supertest.js';

const request = supertest(app);
let authedRequest = new AuthedSupertest();

describe('Authentication Routes', () => {
  describe('GET /auth/login', () => {
    let user;

    before(done => {
      User.remove(() => {
        user = new User({
          local: {
            email: 'test@test.com',
            password: new User().generateHash('password')
          }
        });

        user.save(err => {
          if (err) return done(err);
          done();
        });
      });
    });

    // Clear users after testing
    after(() => {
      return User.remove().exec();
    });

    it('should respond user profile when authenticated', done => {
      request
        .post('/auth/login')
        .send({
          email: 'test@test.com',
          password: 'password'
        })
        .expect(200)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          expect(res.body).to.have.property('token');
          expect(res.body).to.have.property('id');
          expect(res.body).to.have.property('role');
          expect(res.body.id).to.equal(user._id.toString());
          expect(res.body.role).to.equal('ROLE_USER');
          done();
        });
    });
  });

  describe('GET /auth/refresh', () => {
    authedRequest.authorize();

    it('should respond with 401 when not authenticated', done => {
      request
        .post('/auth/refresh')
        .send({})
        .expect(401)
        .end(() => {
          done();
        });
    });

    it('should respond with new token when authenticated', done => {
      authedRequest
        .post('/auth/refresh')
        .send({})
        .expect(200)
        .end((err, res) => {
          expect(res.body).to.have.property('token');
          expect(res.body).to.have.property('id');
          expect(res.body).to.have.property('role');
          expect(res.body.id).to.equal(authedRequest.user._id.toString());
          expect(res.body.role).to.equal('ROLE_USER');
          done();
        });
    });
  });

  describe('GET /auth/logout', () => {
    authedRequest.authorize();

    it('should respond with 401 when not authenticated', done => {
      request
        .post('/auth/logout')
        .send({})
        .expect(401)
        .end(() => {
          // logged out - check for refresh token
          authedRequest
            .post('/auth/refresh')
            .send({})
            .expect(200)
            .end(() => {
              done();
            });
        });
    });

    it('should also respond with 401 when authenticated, but also invalidate the token', done => {
      authedRequest
        .post('/auth/logout')
        .send({})
        .expect(401)
        .end(() => {
          // logged out - check for refresh token
          authedRequest
            .post('/auth/refresh')
            .send({})
            .expect(401)
            .end(() => {
              done();
            });
        });
    });
  });

  describe('POST /auth/signup', () => {
    // Clear users after testing
    after(() => {
      return User.remove().exec();
    });

    it('should respond with 401 when receiving empty data', done => {
      request
        .post('/auth/signup')
        .send({})
        .expect(401)
        .end(() => {
          done();
        });
    });

    it('should respond with proper message when receiving invalid email length', done => {
      request
        .post('/auth/signup')
        .send({
          email: 'inv',
          password: 'invalid'
        })
        .expect(401)
        .end((err, res) => {
          expect(res.text).to.equal('Invalid email length.\n');
          done();
        });
    });

    it('should respond with proper message when receiving invalid email', done => {
      request
        .post('/auth/signup')
        .send({
          email: 'invalidinvalidinvalid',
          password: 'invalidinvalidinvalid'
        })
        .expect(401)
        .end((err, res) => {
          expect(res.text).to.equal('Invalid email address.\n');
          done();
        });
    });

    it('should respond with proper message when receiving invalid password', done => {
      request
        .post('/auth/signup')
        .send({
          email: 'valid@valid.com',
          password: 'invalid'
        })
        .expect(401)
        .end((err, res) => {
          expect(res.text).to.equal('Invalid password length.\n');
          done();
        });
    });

    it('should respond accept valid data', done => {
      request
        .post('/auth/signup')
        .send({
          email: 'valid@valid.com',
          password: 'validpassword'
        })
        .expect(204)
        .end(() => {
          done();
        });
    });
  });

  describe('GET /auth/delete/:uid', () => {
    authedRequest.authorize();

    it('should respond with 500 when passing invalid user', done => {
      request
        .post('/auth/delete/notexisting')
        .send({})
        .expect(500)
        .end(() => {
          done();
        });
    });

    it('should also respond with 204 on success, but also remove the user', done => {
      authedRequest
        .post(`/auth/delete/${authedRequest.user._id}`)
        .send({})
        .expect(204)
        .end(() => {
          // removed user - check for refresh token
          authedRequest
            .post('/auth/refresh')
            .send({})
            .expect(401)
            .end(() => {
              done();
            });
        });
    });
  });
});
