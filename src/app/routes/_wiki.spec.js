import { expect } from 'chai';
import { describe, it } from 'mocha';
import { AuthedSupertest } from '../helper/authed-supertest.js';
import wikiHelper from '../helper/wiki.js';
import WikiEntry from '../models/wikiEntry.model.js';
import WikiTag from '../models/wikiTag.model.js';

let ObjectId = require('mongoose').Types.ObjectId;
let randomUser = new AuthedSupertest();
let randomUser2 = new AuthedSupertest(
  'Testuser',
  'testing',
  'test@test.tt',
  'password'
);
let admin = new AuthedSupertest(
  'Admin User',
  'admin',
  'admin@sirimangalo.org',
  'password',
  'ROLE_ADMIN'
);

describe('Wiki Routes', () => {
  describe('Wiki Helper', () => {
    it('should correctly extract video id from url', () => {
      const urls = [
        '//www.youtube-nocookie.com/embed/Ef4X_5MmVnU?rel=0',
        'http://www.youtube.com/user/Scobleizer#p/u/1/Ef4X_5MmVnU',
        'http://www.youtube.com/watch?v=Ef4X_5MmVnU&feature=channel',
        'http://www.youtube.com/watch?v=Ef4X_5MmVnU&playnext_from=TL&videos=osPknwzXEas&feature=sub',
        'http://www.youtube.com/user/SilkRoadTheatre#p/a/u/2/Ef4X_5MmVnU',
        'http://youtu.be/Ef4X_5MmVnU',
        'http://www.youtube.com/watch?v=Ef4X_5MmVnU&feature=youtu.be',
        'http://youtu.be/Ef4X_5MmVnU',
        'http://www.youtube.com/user/Scobleizer#p/u/1/Ef4X_5MmVnU?rel=0',
        'http://www.youtube.com/watch?v=Ef4X_5MmVnU&feature=channel',
        'http://www.youtube.com/watch?v=Ef4X_5MmVnU&playnext_from=TL&videos=osPknwzXEas&feature=sub',
        'http://www.youtube.com/embed/Ef4X_5MmVnU?rel=0',
        'http://www.youtube.com/watch?v=Ef4X_5MmVnU',
        'http://youtube.com/v/Ef4X_5MmVnU?feature=youtube_gdata_player',
        'http://www.youtube.com/watch?v=Ef4X_5MmVnU&feature=youtube_gdata_player',
        'http://youtube.com/watch?v=Ef4X_5MmVnU&feature=youtube_gdata_player',
        'http://youtu.be/Ef4X_5MmVnU?feature=youtube_gdata_player'
      ];

      for (const url of urls) {
        expect(wikiHelper.extractId(url)).to.equal('Ef4X_5MmVnU');
      }
    });
  });

  describe('POST /api/wiki', () => {
    randomUser.authorize();

    beforeEach(done => {
      WikiEntry.remove(() => {
        WikiEntry
          .insertMany([
            {
              _id: ObjectId('123456789011'),
              title: 'A random title',
              description: 'The description is pretty random, too.',
              videoId: 'Ef4X_5Many1',
              tags: ['random', 'tagA', 'test'],
              user: randomUser.user
            },
            {
              _id: ObjectId('123456789012'),
              title: 'A static title',
              description: 'The description is pretty static, too.',
              videoId: 'Ef4X_5Many2',
              tags: ['static', 'tagB', 'test'],
              user: randomUser.user
            },
            {
              _id: ObjectId('123456789013'),
              title: 'Another static title',
              description: 'But the no explanatory description.',
              videoId: 'Ef4X_5Many3',
              tags: ['static', 'tagB', 'test'],
              user: randomUser.user
            },
            {
              _id: ObjectId('123456789014'),
              title: 'A random, static title',
              description: 'The randomness of static text text search.',
              videoId: 'Ef4X_5Many4',
              tags: ['static', 'random', 'tagA', 'tagB', 'test'],
              user: randomUser.user
            }
          ])
          .then(() => done());
      });
    });

    afterEach(() => {
      return WikiTag.remove().exec();
    });

    it('should find entries via text search', done => {
      randomUser
        .post('/api/wiki')
        .send({
          search: 'please find me a random video'
        })
        .expect(200)
        .end((err, res) => {
          expect(res.body.length).to.not.equal(0);
          done(err);
        });
    });

    it('should limit entries by tags correctly', done => {
      randomUser
        .post('/api/wiki')
        .send({
          tags: ['tagB', 'static']
        })
        .expect(200)
        .end((err, res) => {
          for (const doc of res.body) {
            expect(doc.tags.indexOf('tagB')).to.not.equal(-1);
            expect(doc.tags.indexOf('static')).to.not.equal(-1);
          }

          done(err);
        });
    });

    it('should sort result correctly', done => {
      randomUser
        .post('/api/wiki')
        .send({
          sortBy: 'videoId',
          sortOrder: 'descending'
        })
        .expect(200)
        .end((err, res) => {
          expect(res.body[0].videoId).to.have.string('any4');
          expect(res.body[3].videoId).to.have.string('any1');
          done(err);
        });
    })

    it('should limit and skip correctly', done => {
      randomUser
        .post('/api/wiki')
        .send({
          limit: 2,
          skip: 2
        })
        .expect(200)
        .end((err, res) => {
          expect(res.body.length).to.equal(2);
          expect(res.body[0].videoId).to.have.string('any3');
          done(err);
        });
    });

    it('should find a video via url', done => {
      randomUser
        .post('/api/wiki')
        .send({
          search: 'url=https://www.youtube.com/watch?v=Ef4X_5Many3'
        })
        .expect(200)
        .end((err, res) => {
          expect(res.body[0].videoId).to.equal('Ef4X_5Many3');
          done(err);
        });
    });
  });

  describe('POST /api/wiki/new', () => {
    let entry, tag;

    randomUser.authorize();
    randomUser2.authorize();
    admin.authorize();

    beforeEach(done => {
      WikiEntry.remove(() => {
        entry = new WikiEntry({
          videoId: 'Ef4X_5MmVnU',
          title: 'Testvideo',
          startAt: 0,
          tags: ['Evening Dhamma'],
          user: randomUser.user
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
              done(err);
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
          tags: 'Evening Dhamma,tag1,tag2,tag3'
        })
        .expect(400)
        .end(err => done(err));
    });

    it('should respond with 403 when youtube video is from strange channel', done => {
      randomUser
        .post('/api/wiki/new')
        .send({
          url: 'https://www.youtube.com/watch?v=C0DPdy98e4c',
          tags: 'Evening Dhamma,tag1,tag2,tag3'
        })
        .expect(403)
        .end(err => done(err));
    });

    it('should respond with 403 when similar entry already exists', done => {
      randomUser2
        .post('/api/wiki/new')
        .send({
          url: 'https://www.youtube.com/watch?v=Ef4X_5MmVnU',
          tags: 'Evening Dhamma,tag1,tag2,tag3'
        })
        .expect(403)
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

    it('should allow admins to modify existing entries', done => {
      admin
        .post('/api/wiki/new')
        .send({
          url: 'https://www.youtube.com/watch?v=Ef4X_5MmVnU',
          tags: 'Evening Dhamma,tag1,tag4,tag5'
        })
        .expect(200)
        .end(err => done(err));
    });

    it('should allow owner to modify his entry', done => {
      randomUser
        .post('/api/wiki/new')
        .send({
          url: 'https://www.youtube.com/watch?v=Ef4X_5MmVnU',
          tags: 'Evening Dhamma,tag10'
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
          videoId: 'Ef4X_5MmVnU',
          title: 'Testvideo',
          startAt: 0,
          tags: ['Evening Dhamma'],
          user: randomUser.user
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
          expect(res.body[0].entries[0]).to.have.property('videoId');
          expect(res.body[0].entries[0]).to.have.property('title');
          expect(res.body[0].entries[0]).to.have.property('startAt');
          expect(res.body[0].entries[0]).to.have.property('tags');
          done(err);
        });
    });
  });

  describe('DELETE /api/wiki', () => {
    randomUser.authorize();
    randomUser2.authorize();
    admin.authorize();

    beforeEach(done => {
      WikiEntry.remove(() => {
        WikiEntry
          .insertMany([
            {
              _id: ObjectId('123456789011'),
              title: 'Video A',
              videoId: 'Ef4X_5Many1',
              tags: ['tagA'],
              user: randomUser.user
            },
            {
              _id: ObjectId('123456789012'),
              title: 'Video B',
              videoId: 'Ef4X_5Many2',
              tags: ['tagB', 'tagA'],
              user: randomUser.user
            }
          ])
          .then(() => {
            WikiTag.remove(() => {
              WikiTag
                .insertMany([
                  {
                    _id: 'tagA',
                    entries: [ObjectId('123456789011'), ObjectId('123456789012')],
                    count: 2,
                    related: ['tagB']
                  },
                  {
                    _id: 'tagB',
                    entries: [ObjectId('123456789012')],
                    count: 1,
                    related: ['tagA']
                  }
                ])
                .then(() => done());
            });
          });
      });
    });

    afterEach(() => {
      return WikiEntry.remove().exec() & WikiTag.remove().exec();
    });

    it('should respond with 403 when unauthorized', done => {
      randomUser2
        .delete('/api/wiki/123456789012')
        .expect(403)
        .end(err => done(err));
    });

    it('should respond with 204 and delete record if is admin', done => {
      admin
        .delete('/api/wiki/123456789011')
        .expect(204)
        .end(err => {
          WikiEntry
            .findOne({
              videoId: 'Ef4X_5Many1'
            })
            .then(res => {
              expect(res).to.equal(null);
              done(err);
            });
        });
    });

    it('should respond with 204 and delete record if is owner', done => {
      randomUser
        .delete('/api/wiki/123456789011')
        .expect(204)
        .end(err => {
          if (err) return done(err);

          WikiEntry
            .findOne({
              videoId: 'Ef4X_5Many1'
            })
            .then(res => {
              expect(res).to.equal(null);
              done(err);
            });
        });
    });

    it('should remove references from tags if removed', done => {
      randomUser
        .delete('/api/wiki/123456789012')
        .expect(204)
        .end(err => {
          if (err) return done(err);

          WikiTag
            .findOne({
              _id: 'tagB'
            })
            .then(res => {
              expect(res.count).to.equal(1);
              expect(res.entries.length).to.equal(1);
              expect(res.entries.indexOf(ObjectId('123456789011'))).to.equal(-1);
              done(err);
            });
        });
    });
  });
});
