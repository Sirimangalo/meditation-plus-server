import { expect } from 'chai';
import { describe, it } from 'mocha';
import { AuthedSupertest } from '../helper/authed-supertest.js';
import WikiEntry from '../models/wikiEntry.model.js';
import WikiTag from '../models/wikiTag.model.js';

let randomUser = new AuthedSupertest();
let admin = new AuthedSupertest(
  'Admin User',
  'admin',
  'admin@sirimangalo.org',
  'password',
  'ROLE_ADMIN'
);

describe('Wiki Routes', () => {
  describe('POST /api/wiki/new', () => {
    let entry, tag;

    randomUser.authorize();

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

  describe('POST /api/wiki/tags', () => {
    let entry;

    randomUser.authorize();

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
            WikiTag
              .insertMany([
                { _id: 'tree', count: 3, entries: [ entry._id ], related: ['grass', 'green'] },
                { _id: 'grass', count: 2, related: ['tree'] },
                { _id: 'green', count: 4, related: ['tree', 'frog'] },
                { _id: 'frog', count: 1, related: ['green', 'blue'] }
              ])
              .then(() => done());
          });
        });
      });
    });

    afterEach(() => {
      return WikiEntry.remove().exec() & WikiTag.remove().exec();
    });

    it('should limit and skip correctly', done => {
      randomUser
        .post('/api/wiki/tags')
        .expect(200)
        .send({ limit: 2, skip: 1 })
        .end((err, res) => {
          expect(res.body.length).to.equal(2);
          expect(res.body[0]._id).to.equal('grass');
          done(err);
        });
    });

    it('should find tags by search string', done => {
      randomUser
        .post('/api/wiki/tags')
        .expect(200)
        .send({ search: 'gr' })
        .end((err, res) => {
          expect(res.body.length).to.equal(2);
          expect(res.body[0]._id).to.equal('grass');
          expect(res.body[1]._id).to.equal('green');
          done(err);
        });
    });

    it('should find tags related to given tag', done => {
      randomUser
        .post('/api/wiki/tags')
        .expect(200)
        .send({ relatedTo: ['tree', 'blue'] })
        .end((err, res) => {
          expect(res.body.length).to.equal(3);
          expect(res.body[0]._id).to.equal('frog');
          expect(res.body[1]._id).to.equal('grass');
          expect(res.body[2]._id).to.equal('green');
          done(err);
        });
    });

    it('should sort result correctly', done => {
      randomUser
        .post('/api/wiki/tags')
        .expect(200)
        .send({ sortBy: 'count', sortOrder: 'ascending' })
        .end((err, res) => {
          expect(res.body.length).to.equal(4);
          expect(res.body[0]._id).to.equal('frog');
          expect(res.body[3]._id).to.equal('green');
          done(err);
        });
    });

    it('should populate entries correctly', done => {
      randomUser
        .post('/api/wiki/tags')
        .expect(200)
        .send({ search: 'tree', populate: true })
        .end((err, res) => {
          expect(res.body.length).to.equal(1);
          expect(res.body[0].entries[0]).to.have.property('url');
          expect(res.body[0].entries[0]).to.have.property('title');
          expect(res.body[0].entries[0]).to.have.property('startAt');
          expect(res.body[0].entries[0]).to.have.property('tags');
          done(err);
        });
    });
  });
});
