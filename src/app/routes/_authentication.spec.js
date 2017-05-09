import { app } from '../../server.conf.js';
import supertest from 'supertest';
import { expect } from 'chai';
import User from '../models/user.model.js';
import { AuthedSupertest } from '../helper/authed-supertest.js';

const request = supertest(app);
let authedRequest = new AuthedSupertest();
let adminUser = new AuthedSupertest(
  'Admin',
  'admin',
  'admin@sirimangalo.org',
  'password',
  'ROLE_ADMIN'
);

describe('Authentication Routes', () => {
  describe('GET /auth/login', () => {
    let user;

    before(done => {
      User.remove(() => {
        user = new User({
          local: {
            email: 'test@test.com',
            password: new User().generateHash('password')
          },
          username: 'myusername',
          verified: true
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
          done(err);
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
        .end(err => {
          done(err);
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
          done(err);
        });
    });
  });

  describe('GET /auth/logout', () => {
    authedRequest.authorize();

    it('should respond with 401 when not authenticated', done => {
      request
        .post('/auth/logout')
        .expect(401)
        .end(err => done(err));
    });

    it('should also respond with 401 when authenticated, but also invalidate the token', done => {
      authedRequest
        .post('/auth/logout')
        .expect(401)
        .end(err =>  done(err));
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
        .expect(401)
        .end(err => done(err));
    });

    it('should respond with proper message when receiving invalid email length', done => {
      request
        .post('/auth/signup')
        .send({
          username: 'myusername',
          email: 'inv',
          password: 'invalid'
        })
        .expect(401)
        .end((err, res) => {
          expect(res.text).to.equal('Invalid email length.');
          done(err);
        });
    });

    it('should respond with proper message when receiving invalid email', done => {
      request
        .post('/auth/signup')
        .send({
          username: 'myusername',
          email: 'invalidinvalidinvalid',
          password: 'invalidinvalidinvalid'
        })
        .expect(401)
        .end((err, res) => {
          expect(res.text).to.equal('Invalid email address.');
          done(err);
        });
    });

    it('should respond with proper message when receiving invalid password', done => {
      request
        .post('/auth/signup')
        .send({
          username: 'myusername',
          email: 'valid@valid.com',
          password: 'invalid'
        })
        .expect(401)
        .end((err, res) => {
          expect(res.text).to.equal('Invalid password length.');
          done(err);
        });
    });

    it('should respond accept valid data', done => {
      request
        .post('/auth/signup')
        .send({
          username: 'myusername',
          email: 'valid@valid.com',
          password: 'validpassword'
        })
        .expect(204)
        .end(err => {
          done(err);
        });
    });
  });

  describe('POST /auth/verify', () => {
    let user;

    before(done => {
      User.remove(() => {
        user = new User({
          local: {
            username: 'myusername',
            email: 'test@test.com',
            password: new User().generateHash('password')
          },
          verifyToken: '1111',
          verified: false
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

    it('should respond with 400 when passing no token', done => {
      request
        .post('/auth/verify')
        .expect(400)
        .end(err => {
          done(err);
        });
    });

    it('should respond with 400 when passing invalid token', done => {
      request
        .post('/auth/verify')
        .send({
          token: '0000'
        })
        .expect(400)
        .end(err => {
          done(err);
        });
    });

    it('should respond with 200 when token is correct and change verified status', done => {
      request
        .post('/auth/verify')
        .send({
          token: '1111'
        })
        .expect(200)
        .end(err => {
          // Check if verified is now set to TRUE
          User
            .findOne()
            .then(user => {
              expect(user.verified).to.equal(true);
              done(err);
            });
        });
    });
  });

  describe('POST /auth/resend', () => {
    let user;

    before(done => {
      User.remove(() => {
        user = new User({
          local: {
            username: 'myusername',
            email: 'test@iamasurelynonexistentdomain.com',
            password: new User().generateHash('password')
          },
          verifyToken: '1111',
          verified: true
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

    it('should respond with 400 when passing invalid email', done => {
      request
        .post('/auth/resend')
        .send({
          email: 'wrong'
        })
        .expect(400)
        .end(err => {
          done(err);
        });
    });

    it('should respond with 400 when user is already verified', done => {
      request
        .post('/auth/resend')
        .send({
          email: 'test@iamasurelynonexistentdomain.com'
        })
        .expect(400)
        .end(err => {
          done(err);
        });
    });

    it('should respond with 400 when user has no token', done => {
      delete user.verifyToken;

      user.save(err => {
        if (err) return done(err);

        request
          .post('/auth/resend')
          .send({
            email: 'test@iamasurelynonexistentdomain.com'
          })
          .expect(400)
          .end(err => {
            done(err);
          });
      });
    });

    it('should respond with 204 or 501 when user has token and is not verified', done => {
      user.verified = false;

      user.save(err => {
        if (err) return done(err);

        request
          .post('/auth/resend')
          .send({
            email: 'test@iamasurelynonexistentdomain.com'
          })
          .expect(res => {
            return res.statusCode === 501 || res.statusCode === 204;
          })
          .end(err => {
            done(err);
          });
      });
    });
  });

  describe('POST /auth/reset-init', () => {
    let user;

    before(done => {
      User.remove(() => {
        user = new User({
          local: {
            username: 'myusername',
            email: 'test@iamasurelynonexistentdomain.com',
            password: new User().generateHash('password')
          },
          verifyToken: '1111',
          verified: true
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

    it('should respond with 400 when passing invalid email', done => {
      request
        .post('/auth/reset-init')
        .send({
          email: 'invalid'
        })
        .expect(400)
        .end(err => {
          done(err);
        });
    });

    it('should respond with 204 or 501 when email is valid', done => {
      user.verified = false;

      user.save(err => {
        if (err) return done(err);

        request
          .post('/auth/reset-init')
          .send({
            email: 'test@iamasurelynonexistentdomain.com'
          })
          .expect(res => {
            return res.statusCode === 501 || res.statusCode === 204;
          })
          .end(err => {
            done(err);
          });
      });
    });
  });

  describe('POST /auth/reset', () => {
    let user;
    const password = new User().generateHash('password');

    before(done => {
      User.remove(() => {
        user = new User({
          local: {
            username: 'myusername',
            email: 'test@test.com',
            password: password
          },
          verifyToken: '1111',
          verified: true,
          recoverUntil: Date.now() + 9999
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

    it('should respond with 400 when passing invalid id or token', done => {
      request
        .post('/auth/reset')
        .send({
          userId: 'invalid'
        })
        .expect(400)
        .end(err => {
          done(err);
        });
    });

    it('should respond with 400 when user is not verified', done => {
      user.verified = false;

      user.save(err => {
        if (err) return done(err);

        request
          .post('/auth/reset')
          .send({
            userId: '507f191e810c19729de860ea',
            token: '1111'
          })
          .expect(400)
          .end(err => {
            done(err);
          });
      });

    });

    it('should respond with 401 when token has expired', done => {
      user.verified = true;
      user.recoverUntil = 0;

      user.save(err => {
        if (err) return done(err);

        request
          .post('/auth/reset')
          .send({
            userId: user._id,
            token: '1111'
          })
          .expect(401)
          .end(err => {
            done(err);
          });
      });
    });

    it('should respond with 400 when passing invalid password', done => {
      user.verified = true;
      user.recoverUntil = Date.now() + 9999;

      user.save(err => {
        if (err) return done(err);

        request
          .post('/auth/reset')
          .send({
            userId: user._id,
            token: '1111',
            newPassword: 'invalid'
          })
          .expect(400)
          .end(err => {
            done(err);
          });
      });
    });

    it('should respond with 200 when request is valid and change the password', done => {
      user.verified = true;
      user.recoverUntil = Date.now() + 9999;

      user.save(err => {
        if (err) return done(err);

        request
          .post('/auth/reset')
          .send({
            userId: user._id,
            token: '1111',
            newPassword: 'validvalidvalid'
          })
          .expect(200)
          .end(err => {
            // check if password changed
            User
              .findOne()
              .then(user => {
                expect(user.local.password).to.not.equal(password);
                done(err);
              });
          });
      });
    });
  });

  describe('GET /auth/delete/:uid', () => {
    adminUser.authorize();

    it('should respond with 500 when passing invalid user', done => {
      adminUser
        .delete('/auth/delete/notexisting')
        .expect(500)
        .end(err => {
          done(err);
        });
    });

    it('should also respond with 204 on success, but also remove the user', done => {
      adminUser
        .delete(`/auth/delete/${adminUser.user._id}`)
        .send({})
        .expect(204)
        .end(err => {
          done(err);
        });
    });
  });
});
