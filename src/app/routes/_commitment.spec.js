import { app } from '../../server.conf.js';
import supertest from 'supertest';
import { expect } from 'chai';
import { AuthedSupertest } from '../helper/authed-supertest.js';
import Commitment from '../models/commitment.model.js';

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

describe('Commitement Routes', () => {
  let commitment;

  beforeEach(done => {
    Commitment.remove(() => {
      commitment = new Commitment({
        type: 'weekly',
        minutes: 840,
        users: [user.user]
      });

      commitment.save(err => {
        if (err) return done(err);
        done();
      });
    });
  });

  afterEach(() => {
    return Commitment.remove().exec();
  });

  describe('GET /api/commitment', () => {
    user.authorize();
    user2.authorize();

    it('should respond with 401 when not authenticated', done => {
      request
        .get('/api/commitment')
        .expect(401)
        .end(err => done(err));
    });

    it('should respond with one commit for the connected user', done => {
      user
        .get('/api/commitment')
        .expect(200)
        .end((err, res) => {
          expect(res.body.length).to.equal(1);
          done(err);
        });
    });

    it('should respond all the commitments of the current user total of 2', done => {
      Commitment.create({
        type: 'weekly',
        minutes: 840,
        users: [user.user, user2.user]
      }).then((res, err) => {
        if (err) return done(err);
        user
          .get('/api/commitment')
          .expect(200)
          .end((err, res) => {
            if (err) return done(err);
            expect(res.body.length).to.equal(2);
            done();
          });
      });
    });
  });

  describe('GET /api/commitment/:id', () => {
    user.authorize();
    admin.authorize();

    it('should respond with 401 when not authenticated', done => {
      request
        .get(`/api/commitment/${commitment._id}`)
        .expect(401)
        .end(err => done(err));
    });

    it('should respond with 401 when authenticated as user', done => {
      user
        .get(`/api/commitment/${commitment._id}`)
        .expect(401)
        .end(err => done(err));
    });

    it('should correctly return when authenticated as admin', done => {
      admin
        .get(`/api/commitment/${commitment._id}`)
        .expect(200)
        .end((err, res) => {
          expect(res.body._id).to.equal(commitment._id.toString());
          done(err);
        });
    });
  });


  describe('PUT /api/commitment/:id', () => {
    user.authorize();
    admin.authorize();

    it('should respond with 401 when not authenticated', done => {
      request
        .put(`/api/commitment/${commitment._id}`)
        .send({
          type: 'daily',
          minutes: 60
        })
        .expect(401)
        .end(err => done(err));
    });

    it('should respond with 401 when authenticated as user', done => {
      user
        .put(`/api/commitment/${commitment._id}`)
        .send({
          type: 'daily',
          minutes: 60
        })
        .expect(401)
        .end(err => done(err));
    });

    it('should correctly return when authenticated as admin', done => {
      admin
        .put(`/api/commitment/${commitment._id}`)
        .send({
          type: 'daily',
          minutes: 60
        })
        .expect(200)
        .end(err => done(err));
    });
  });

  describe('POST /api/commitment', () => {
    user.authorize();
    admin.authorize();

    it('should respond with 401 when not authenticated', done => {
      request
        .post('/api/commitment')
        .send({
          type: 'daily',
          minutes: 60
        })
        .expect(401)
        .end(err => done(err));
    });

    it('should respond with 401 when authenticated as user', done => {
      user
        .post('/api/commitment')
        .send({
          type: 'daily',
          minutes: 60
        })
        .expect(401)
        .end(err => done(err));
    });

    it('should correctly return when authenticated as admin', done => {
      admin
        .post('/api/commitment')
        .send({
          type: 'daily',
          minutes: 60
        })
        .expect(201)
        .end(err => done(err));
    });
  });

  describe('POST /api/commitment/:id/commit', () => {
    user.authorize();
    user2.authorize();

    it('should respond with 401 when not authenticated', done => {
      request
        .post(`/api/commitment/${commitment._id}/commit`)
        .expect(401)
        .end(err => done(err));
    });

    it('should respond with 400 when the user is already committed', done => {
      user
        .post(`/api/commitment/${commitment._id}/commit`)
        .expect(400)
        .end(err => done(err));
    });

    it('should updated add user to commitment user list code 204', done => {
      user2
        .post(`/api/commitment/${commitment._id}/commit`)
        .expect(204)
        .end(err => done(err));
    });
  });


  describe('POST /api/commitment/:id/uncommit', () => {
    user.authorize();
    user2.authorize();


    it('should respond with 401 when not authenticated', done => {
      request
        .post(`/api/commitment/${commitment._id}/uncommit`)
        .expect(401)
        .end(err => done(err));
    });

    it('should respond with 400 when the user is absent from commitment list', done => {
      user2
        .post(`/api/commitment/${commitment._id}/uncommit`)
        .expect(400)
        .end(err => done(err));
    });

    it('should uncommit the user code 204', done => {
      user
        .post(`/api/commitment/${commitment._id}/uncommit`)
        .expect(204)
        .end(err => done(err));
    });
  });


  describe('DELETE /api/commitment/:id', () => {
    user.authorize();
    admin.authorize();

    it('should respond with 401 when not authenticated', done => {
      request
        .delete(`/api/commitment/${commitment._id}`)
        .expect(401)
        .end(err => done(err));
    });

    it('should respond with 401 when authenticated as user', done => {
      user
        .delete(`/api/commitment/${commitment._id}`)
        .expect(401)
        .end(err => done(err));
    });

    it('should correctly delete when authenticated as admin', done => {
      admin
        .delete(`/api/commitment/${commitment._id}`)
        .expect(200)
        .end(err => {
          if (err) return done(err);

          // check if really deleted
          admin
            .get(`/api/commitment/${commitment._id}`)
            .expect(404)
            .end(err => done(err));
        });
    });
  });
});
