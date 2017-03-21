import { app } from '../../server.conf.js';
import supertest from 'supertest';
import { expect } from 'chai';
import { AuthedSupertest } from '../helper/authed-supertest.js';
import Meditation from '../models/meditation.model.js';
import moment from 'moment';

const request = supertest(app);
let user = new AuthedSupertest();
let user2 = new AuthedSupertest(
  'Second User',
  'user2@sirimangalo.org',
  'password'
);

describe('Meditation Routes', () => {
  let meditation;

  beforeEach(done => {
    Meditation.remove(() => {
      meditation = new Meditation({
        sitting: 10,
        walking: 10,
        createdAt: moment(),
        end: moment().add(20, 'minutes'),
        user: user.user,
        numOfLikes: 0
      });

      meditation.save(err => {
        if (err) return done(err);
        done();
      });
    });
  });

  afterEach(() => {
    return Meditation.remove().exec();
  });

  describe('GET /api/meditation', () => {
    user.authorize();
    user2.authorize();

    it('should respond with 401 when not authenticated', done => {
      request
        .get('/api/meditation')
        .expect(401)
        .end(err => done(err));
    });

    it('should respond with data when authenticated', done => {
      user
        .get('/api/meditation')
        .expect(200)
        .end((err, res) => {
          expect(res.body.length).to.equal(1);
          expect(res.body[0].user._id).to.equal(user.user._id.toString());
          done(err);
        });
    });

    it('should respond with more data when added', done => {
      Meditation.create({
        sitting: 10,
        walking: 10,
        createdAt: moment(),
        end: moment().add(20, 'minutes'),
        user: user2.user,
        numOfLikes: 0
      }).then((res, err) => {
        if (err) return done(err);

        user
          .get('/api/meditation')
          .expect(200)
          .end((err, res) => {
            if (err) return done(err);
            expect(res.body.length).to.equal(2);
            done();
          });
      });
    });
  });

  describe('POST /api/meditation', () => {
    user.authorize();
    user2.authorize();

    it('should respond with 401 when not authenticated', done => {
      request
        .post('/api/meditation')
        .expect(401)
        .end(err => done(err));
    });

    it('should save meditation when authenticated', done => {
      user2
        .post('/api/meditation')
        .send({ sitting: 20, walking: 20 })
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.sitting).to.equal(20);
          expect(res.body.walking).to.equal(20);
          expect(res.body.user).to.equal(user2.user._id.toString());

          // two meditations should be found
          user
            .get('/api/meditation')
            .expect(200)
            .end((err, res) => {
              if (err) return done(err);
              expect(res.body.length).to.equal(2);
              done();
            });
        });
    });

    it('should update meditation', done => {
      user
        .post('/api/meditation')
        .send({ sitting: 20, walking: 20 })
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.sitting).to.equal(20);
          expect(res.body.walking).to.equal(20);
          expect(res.body.user).to.equal(user.user._id.toString());

          // one meditation should be found
          user
            .get('/api/meditation')
            .expect(200)
            .end((err, res) => {
              if (err) return done(err);
              expect(res.body.length).to.equal(1);
              done();
            });
        });
    });
  });

  describe('POST /api/meditation/stop', () => {
    user.authorize();
    user2.authorize();

    it('should respond with 401 when not authenticated', done => {
      request
        .post('/api/meditation/stop')
        .expect(401)
        .end(err => done(err));
    });

    it('should respond with 400 when not meditating', done => {
      user2
        .post('/api/meditation/stop')
        .expect(400)
        .end(err => done(err));
    });

    it('should stop meditation when authenticated', done => {
      user
        .post('/api/meditation/stop')
        .expect(204)
        .end(err => done(err));
    });
  });

  describe('POST /api/meditation/like', () => {
    user.authorize();
    user2.authorize();

    it('should respond with 401 when not authenticated', done => {
      request
        .post('/api/meditation/like')
        .expect(401)
        .end(err => done(err));
    });

    it('should like meditations when authenticated', done => {
      user
      .post('/api/meditation/like')
      .expect(204)
      .end(err => {
        if (err) done(err);
        // one like should be found
        user
        .get('/api/meditation')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          try{
            expect(res.body.length).to.equal(1);
            expect(res.body[0].numOfLikes).to.equal(1);
            done();
          }catch(e){
            //console.log('exception', e);
            done(e);
          }
        });
      });
    });
  });

  describe('GET /api/meditation/times', () => {
    user.authorize();

    it('should respond with 401 when not authenticated', done => {
      request
        .get('/api/meditation/times')
        .expect(401)
        .end(err => done(err));
    });

    it('should respond with data when authenticated', done => {
      user
        .get('/api/meditation/times')
        .expect(200)
        .end((err, res) => {
          let sum = 0;
          Object.keys(res.body).forEach(key => {
            sum += res.body[key];
          });
          expect(Object.keys(res.body).length).to.equal(24);
          expect(sum).to.equal(20);
          done(err);
        });
    });
  });
});
