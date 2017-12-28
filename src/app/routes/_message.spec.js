import { app } from '../../server.conf.js';
import supertest from 'supertest';
import { expect } from 'chai';
import { AuthedSupertest } from '../helper/authed-supertest.js';
import Message from '../models/message.model.js';
import moment from 'moment-timezone';

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

describe('Message Routes', () => {
  let message, privateMessage;

  beforeEach(done => {
    Message.remove(() => {
      message = new Message({
        text: 'My message text',
        user: user.user
      });

      message.save(err => {
        privateMessage = new Message({
          user: user.user,
          text: 'private',
          private: true
        });

        privateMessage.save(err => {
          if (err) return done(err);
          done();
        })
      });
    });
  });

  afterEach(() => {
    return Message.remove().exec();
  });

  describe('GET /api/message', () => {
    user.authorize();

    it('should respond with 401 when not authenticated', done => {
      request
        .get('/api/message')
        .expect(401)
        .end(err => done(err));
    });

    it('should respond with data when authenticated', done => {
      user
        .get('/api/message')
        .expect(200)
        .end((err, res) => {
          expect(res.body.length).to.equal(1);
          expect(res.body[0].user._id).to.equal(user.user._id.toString());
          done(err);
        });
    });

    it('should respond with more data when added', done => {
      Message.create({
        text: 'Another message',
        user: user.user
      }).then((res, err) => {
        if (err) return done(err);

        user
          .get('/api/message')
          .expect(200)
          .end((err, res) => {
            expect(res.body.length).to.equal(2);

            // make sure no private messages get in chat
            res.body.map(m => {
              expect('private' in m && m['private'] === true).to.equal(false);
              expect(m.text).to.not.equal('private');
            });

            done(err);
          });
      });
    });
  });

  describe('POST /api/message/synchronize', () => {
    user.authorize();

    it('should respond with 401 when not authenticated', done => {
      request
        .post('/api/message/synchronize')
        .expect(401)
        .end(err => done(err));
    });

    it('should respond with messages when authenticated', done => {
      user
        .post('/api/message/synchronize')
        .send({
          timeFrameStart: moment().subtract(1, 'hour'),
          timeFrameEnd: moment().add(1, 'hour')
        })
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.length).to.equal(1);
          expect(res.body.text === 'privat' || 'private' in res.body[0] && res.body[0]['private'] === true).to.equal(false);
          done();
        });
    });
  });

  describe('POST /api/message', () => {
    user.authorize();

    it('should respond with 401 when not authenticated', done => {
      request
        .post('/api/message')
        .expect(401)
        .end(err => done(err));
    });

    it('should save message when authenticated', done => {
      user
        .post('/api/message')
        .send({ text: 'My Text' })
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.text).to.equal('My Text');
          done();
        });
    });
  });

  describe('PUT /api/message/:id', () => {
    user.authorize();
    admin.authorize();

    it('should respond with 401 when not authenticated', done => {
      request
        .put(`/api/message/${message._id}`)
        .expect(401)
        .end(err => done(err));
    });

    it('should respond with 400 when not allowed', done => {
      user2
        .put(`/api/message/${message._id}`)
        .expect(401)
        .end(err => done(err));
    });

    it('should update message when owner', done => {
      user
        .put(`/api/message/${message._id}`)
        .send({ text: 'My Text 2' })
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.text).to.equal('My Text 2');
          expect(res.body.edited).to.equal(true);
          done();
        });
    });

    it('should update message when admin', done => {
      admin
        .put(`/api/message/${message._id}`)
        .send({ text: 'My Text 2' })
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.text).to.equal('My Text 2');
          expect(res.body.edited).to.equal(true);
          done();
        });
    });
  });

  describe('DELETE /api/message/:id', () => {
    user.authorize();
    admin.authorize();

    it('should respond with 401 when not authenticated', done => {
      request
        .delete(`/api/message/${message._id}`)
        .expect(401)
        .end(err => done(err));
    });

    it('should respond with 400 when now allowed', done => {
      user2
        .delete(`/api/message/${message._id}`)
        .expect(401)
        .end(err => done(err));
    });

    it('should correctly delete when authenticated as admin', done => {
      admin
        .delete(`/api/message/${message._id}`)
        .expect(200)
        .end(err => done(err));
    });

    it('should correctly delete when owner', done => {
      user
        .delete(`/api/message/${message._id}`)
        .expect(200)
        .end(err => done(err));
    });
  });
});
