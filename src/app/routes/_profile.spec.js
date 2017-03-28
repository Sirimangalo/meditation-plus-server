
import { app } from '../../server.conf.js';
import supertest from 'supertest';
import { expect } from 'chai';
import {describe, it} from 'mocha';
import moment from 'moment';
import { AuthedSupertest } from '../helper/authed-supertest.js';
import  User from '../models/user.model.js';

const request = supertest(app);
let userBasicInfos = {
  name: 'John Doe',
  password: 'password',
  email: 'johndoe@sirimangalo.org'
};
let randomUser = new AuthedSupertest();
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

let yesterday = moment.utc().add(-1, 'days');
let userCustomInfos = {
  name: userBasicInfos.name,
  local:{
    password: userBasicInfos.password,
    email: userBasicInfos.email
  },
  suspendedUntil : new Date(),
  role: 'ROLE_ADMIN',
  showEmail: true,
  hideStats: false,
  description: 'test description',
  website: 'test.loc',
  country: 'France',
  lastActive: yesterday.toDate(),
  lastMeditation: yesterday.add(1, 'hours').toDate(),
  lastLike: yesterday.add(1.5, 'hours').toDate(),
  timezone: 'UTC',
  gravatarHash: 'gravatar hash'
};
describe('Profile Routes', () => {
  let profile;
  beforeEach(done => {
    User.remove({ email: userBasicInfos.email},() => {
      profile = new User(userCustomInfos);
      profile.save(err => {
        if (err) return done(err);
        done();
      });
    });
  });

  afterEach(done => {
    User.remove({_id: profile._id}).exec().then((ok, err) =>{
      if(err) return done(err);
      done();
    });
  });

  describe('GET /api/profile', () => {
    randomUser.authorize();
    user2.authorize();

    it('should respond with 401 when not authenticated', done => {
      request
      .get('/api/profile')
      .expect(401)
      .end(err => done(err));
    });

    it('should respond with profile details for the connected user', done => {
      user2
      .get('/api/profile')
      .expect(200)
      .end((err, res) => {
        expect(res.body.name).to.equal('Second User');
        expect(res.body.local.email).to.equal('user2@sirimangalo.org');
        expect(res.body.local.password).to.be.undefined;
        done(err);
      });
    });
  });



  describe('GET /api/profile/:id', () => {
    randomUser.authorize();
    user2.authorize();
    admin.authorize();

    it('should respond with 401 when not authenticated', done => {
      request
      .get(`/api/profile/${profile._id}`)
      .expect(401)
      .end(err => done(err));
    });

    it('should respond with 404 when profile does not exist (wrong id)', done => {
      let wrongId = profile._id.toString().replace(/[1-9]/gi, '2');
      randomUser
      .get(`/api/profile/${wrongId}`)
      .expect(404)
      .end(err => done(err));
    });

    it('should respond with the profile', done => {
      randomUser
      .get(`/api/profile/${profile._id}`)
      .expect(200)
      .end((err, res) => {
        expect(res.body.name).to.equal(userBasicInfos.name);
        expect(res.body.local.email).to.equal(userBasicInfos.email);
        expect(res.body.local.password).to.be.undefined;
        done(err);
      });
    });


    describe('Testing email and stats availability', () => {


      beforeEach(done => {
        profile.showEmail = false;
        profile.hideStats = true;
        profile.save(err => {
          if (err) return done(err);
          done();
        });
      });
      it('should respond with the profile without email', done => {
        user2
          .get(`/api/profile/${profile._id}`)
          .expect(200)
          .end((err, res) => {
            expect(res.body.showEmail).to.equal(false);
            expect(res.body.local.email).to.be.undefined;
            done(err);
          });
      });

      it('should respond with the profile without stats for user different of owner', done => {
        randomUser
          .get(`/api/profile/${profile._id}`)
          .expect(200)
          .end((err, res) => {
            expect(res.body.hideStats).to.equal(true);
            expect(res.body.meditations).to.be.undefined;
            done(err);
          });
      });

      it('should respond with the profile with hidden stats if requested by the owner', done => {
        randomUser
          .get(`/api/profile/${profile._id}`)
          .expect(200)
          .end((err, res) => {
            expect(res.body.hideStats).to.equal(true);
            expect(res.body.meditations).to.be.undefined;
            done(err);
          });
      });

    });
  });

  describe('PUT /api/profile', () => {
    randomUser.authorize();
    user2.authorize();

    it('should respond with 401 when not authenticated', done => {
      request
      .put('/api/profile')
      .expect(401)
      .end(err => done(err));
    });

    it('should respond with 200 when user profile updated', done => {
      let tmpCustomUserInfo = { local: {} };
      tmpCustomUserInfo.local.email = 'user2put@sirimangalo.org';
      tmpCustomUserInfo.name = 'Second User PUT';
      tmpCustomUserInfo.timezone = 'UTC';

      user2
        .put('/api/profile')
        .send(tmpCustomUserInfo)
      .expect(200)
      .end((err) => {
        if (err) return done(err);
        // check if really updated
        user2
          .get('/api/profile')
          .expect(200)
          .end((err, res) => {
            expect(res.body.name).to.equal('Second User PUT');
            expect(res.body.local.email).to.equal('user2put@sirimangalo.org');
            expect(res.body.local.password).to.be.undefined;
            expect(res.body.timezone).to.equal('UTC');
            done(err);
          });
      });
    });

    it('should respond with 400 when wrong timezone format', done => {
      let tmpCustomUserInfo = { local: {} };
      tmpCustomUserInfo.timezone = 'EST';
      randomUser
        .put('/api/profile')
        .send(tmpCustomUserInfo)
        .expect(400)
        .end(err => done(err));
    }).timeout(5000);

    it('should respond 400 when duplicate email', done => {
      let tmpCustomUserInfo = { local: {} };
      tmpCustomUserInfo.local.email = 'user@sirimangalo.org';
      user2
        .put('/api/profile')
        .send(tmpCustomUserInfo)
        .expect(400)
        .end(err =>done(err));
    });

    it('should respond fail when local field is not defined', done => {
      let tmpCustomUserInfo = { };
      tmpCustomUserInfo.showEmail = true;
      user2
        .put('/api/profile')
        .send(tmpCustomUserInfo)
        .expect(400)
        .end(err =>done(err));
    });
  });

});
