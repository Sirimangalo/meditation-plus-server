import { app } from '../../server.conf.js';
import supertest from 'supertest';
import { expect } from 'chai';
import {describe, it} from 'mocha';
import { AuthedSupertest } from '../helper/authed-supertest.js';
import WikiEntry from '../models/wikiEntry.model.js';
import WikiTag from '../models/wikiTag.model.js';

let ObjectId = require('mongoose').Types.ObjectId;

const request = supertest(app);
let randomUser = new AuthedSupertest();
let admin = new AuthedSupertest(
  'Admin User',
  'admin',
  'admin@sirimangalo.org',
  'password',
  'ROLE_ADMIN'
);

describe('Wiki Routes', () => {
  let entry, tag;

  beforeEach(done => {
    WikiEntry.remove(() => {
      entry = new WikiEntry({
        url: 'https://youtu.be/Ef4X_5MmVnU',
        title: 'Testvideo',
        startAt: 0,
        tags: ['Evening Dhamma']
      });

      entry.save(err => {
        if (err) return done(err);

        WikiTag.remove(() => {
          tag = new WikiTag({
            _id: 'Evening Dhamma',
            count: 1,
            entries: [ entry._id ]
          });

          tag.save(err => {
            if (err) return done(err);
            done();
          });
        });
      });
    });
  });

  afterEach(() => {
    return WikiTag.remove().exec() & WikiEntry.remove().exec();
  });

  describe('POST /api/wiki/new', () => {
    randomUser.authorize();

    it('should respond with 400 when missing parameters', done => {
      randomUser
        .post('/api/wiki/new')
        .expect(400)
        .end(err => done(err));
    });

    it('should respond with 400 when given invalid url', done => {
      randomUser
        .post('/api/wiki/new')
        .send({
          url: 'https://vimeo.com/189919038',
          tags: 'tag1,tag2,tag3'
        })
        .expect(400)
        .end(err => done(err));
    });

    it('should respond with 403 when youtube video is from strange channel', done => {
      randomUser
        .post('/api/wiki/new')
        .send({
          url: 'https://www.youtube.com/watch?v=C0DPdy98e4c',
          tags: 'tag1,tag2,tag3'
        })
        .expect(403)
        .end(err => done(err));
    });

    it('should respond with 400 when similar entry already exists', done => {
      randomUser
        .post('/api/wiki/new')
        .send({
          url: 'https://www.youtube.com/watch?v=Ef4X_5MmVnU',
          tags: 'tag1,tag2,tag3'
        })
        .expect(400)
        .end(err => done(err));
    });

    it('should respond with 403 when not providing at least one existing tag', done => {
      randomUser
        .post('/api/wiki/new')
        .send({
          // valid url
          url: 'https://www.youtube.com/watch?v=zycVtYRhqpU',
          tags: 'I do not exist'
        })
        .expect(403)
        .end(err => done(err));
    });

    it('should respond with 200 on valid request', done => {
      randomUser
        .post('/api/wiki/new')
        .send({
          // valid url
          url: 'https://www.youtube.com/watch?v=zycVtYRhqpU',
          // valid tags
          tags: 'Evening Dhamma,tag1,tag2,tag3'
        })
        .expect(200)
        .end(err => done(err));
    });

    it('should not respond with 200 when using existing URL at different starting position', done => {
      randomUser
        .post('/api/wiki/new')
        .send({
          url: 'https://www.youtube.com/watch?v=Ef4X_5MmVnU&t=50',
          tags: 'Evening Dhamma,tag1,tag2,tag3'
        })
        .expect(200)
        .end(err => done(err));
    });
  });
});
