import { app } from '../../server.conf.js';
import supertest from 'supertest';
import { expect } from 'chai';
import { AuthedSupertest } from '../helper/authed-supertest.js';
import Question from '../models/question.model.js';
import Broadcast from '../models/broadcast.model.js';

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


describe('Question Routes', () => {
  let question;

  beforeEach(done => {
    Question.remove(() => {
      question = new Question({
        text : 'What is nibbana ?',
        user : user.user,
        //broadcast : { type: mongoose.Schema.Types.ObjectId, ref: 'Broadcast' },
        answered: false,
        likes: [user.user],
        numOfLikes: 1
      });

      question.save(err => {
        if (err) return done(err);
        done();
      });
    });
  });

  afterEach(() => {
    return Question.remove().exec();
  });

  describe('GET /api/question', () => {
    user.authorize();
    user2.authorize();

    it('should respond with 401 when not authenticated', done => {
      request
        .get('/api/question')
        .expect(401)
        .end(err => done(err));
    });

    it('should respond with data when authenticated', done => {
      user
        .get('/api/question')
        .expect(200)
        .end((err, res) => {
          expect(res.body.length).to.equal(1);
          expect(res.body[0].user.username).to.equal(user.user.username);
          done(err);
        });
    });

    it('should respond with liked question', done => {
      user
        .get('/api/question')
        .expect(200)
        .end((err, res) => {
          expect(res.body.length).to.equal(1);
          expect(res.body[0].alreadyLiked).to.equal(true);
          done(err);
        });
    });

    it('should respond with only answered questions', done => {
      Question.create({
        text : 'What is the that?',
        user : user.user,
        //broadcast : { type: mongoose.Schema.Types.ObjectId, ref: 'Broadcast' },
        answered: true,
        answeringAt: new Date(),
        answeredAt: new Date(),
        videoUrl: 'none',
        likes: [user.user],
        numOfLikes: 1
      }).then((res, err) => {
        if (err) return done(err);

        user
          .get('/api/question')
          .query({'filterAnswered': true})
          .expect(200)
          .end((err, res) => {
            if (err) return done(err);
            expect(res.body.length).to.equal(1);
            expect(res.body[0].answered).to.equal(true);
            done();
          });
      });
    });

    it('should find 1 at question count', done => {
      user
        .get('/api/question/count')
        .expect(200)
        .end((err, res) => {
          expect(res.body).to.equal(1);
          done(err);
        });
    });
  });

  describe('POST /api/question', () => {
    user.authorize();
    user2.authorize();
    admin.authorize();

    it('should respond with 401 when not authenticated', done => {
      request
        .post('/api/question')
        .expect(401)
        .end(err => done(err));
    });

    /* FIXME(sebastian): I can't test this.
    google api needed to test this in local
    it('should suggestions for entered text', done => {

      Broadcast.create({
        started: new Date(),
        ended: new Date(),
        videoUrl: 'http://nibbana.fr'
      }).then((res, err) =>{
        if (err) return done(err);

        Question.create({
          text : 'How to attain nibbana?',
          user : user2.user,
          broadcast : res,
          answered: true,
          answeringAt: new Date(),
          answeredAt: new Date(),
          videoUrl: 'http://nibbana.fr',
          likes: [user.user],
          numOfLikes: 1
        }).then((res, err) => {
          if (err) return done(err);

          user2
            .post('/api/question/suggestions')
            .send({text: 'nibbana'})
            .expect(200)
            .end((err, res) => {
              if (err) return done(err);
              expect(res.body.questions.length).to.equal(1);
              expect(res.body.questions[0].videoUrl).to.equal('http://nibbana.fr');
              done();
            });
        });
      });
    });*/


    it('should add one more question', done => {
      user
        .post('/api/question')
        .send({ text: 'What should i do about frustration ?'})
        .expect(204)
        .end((err) => {
          if (err) return done(err);
          // one question should be found
          user
            .get('/api/question')
            .expect(200)
            .end((err, res) => {
              if (err) return done(err);
              expect(res.body.length).to.equal(2);
              done();
            });
        });
    });

    it('should return 400 because the user already liked the question', done => {
      user
        .post(`/api/question/${question.id}/like`)
        .expect(400)
        .end((err) => {
          if (err) return done(err);
          // one question should be found
          done();
        });
    });

    it('should add one more like to the question', done => {
      user2
        .post(`/api/question/${question.id}/like`)
        .expect(204)
        .end((err) => {
          if (err) return done(err);
          user
            .get('/api/question')
            .expect(200)
            .end((err, res) => {
              if (err) return done(err);
              expect(res.body[0].likes.length).to.equal(2);
              done();
            });
        });
    });

    it('shouldn\'t be able to  answer an question if not the admin', done => {
      user2
        .post(`/api/question/${question.id}/answer`)
        .expect(403)
        .end((err) => {
          if (err) return done(err);
          done();
        });
    });

    it('should return an answered question', done => {
      admin
        .post(`/api/question/${question.id}/answer`)
        .expect(204)
        .end((err) => {
          if (err) return done(err);
          admin
            .get('/api/question')
            .query({filterAnswered :'true'})
            .expect(200)
            .end((err, res) => {
              if (err) return done(err);
              expect(res.body[0].answered).to.equal(true);
              done();
            });
        });
    });

    it('should assert that the question has already been answered', done => {
      admin
        .post(`/api/question/${question.id}/answer`)
        .expect(204)
        .end((err) => {
          if (err) return done(err);
          admin
            .post(`/api/question/${question.id}/answer`)
            .expect(400)
            .end((err) => {
              if (err) return done(err);
              user
                .get('/api/question')
                .query({filterAnswered :'true'})
                .expect(200)
                .end((err, res) => {
                  if (err) return done(err);
                  expect(res.body[0].answered).to.equal(true);
                  done();
                });
            });
        });
    });

  });

  describe('DELETE /api/question', () => {
    user.authorize();
    user2.authorize();
    admin.authorize();

    it('shouldn\'t be able to delete a question if not the owner or the admin', done => {
      user2
        .delete(`/api/question/${question.id}`)
        .expect(403)
        .end((err) => {
          if (err) return done(err);
          done();
        });
    });

    it('should find no question for it has been deleted by the author', done => {
      user
        .delete(`/api/question/${question.id}`)
        .expect(204)
        .end((err) => {
          if (err) return done(err);
          user
            .get('/api/question')
            .expect(200)
            .end((err, res) => {
              if (err) return done(err);
              expect(res.body.length).to.equal(0);
              done();
            });
        });
    });

    it('should find no question for it has been delete by the admin', done => {
      admin
        .delete(`/api/question/${question.id}`)
        .expect(204)
        .end((err) => {
          if (err) return done(err);
          user
            .get('/api/question')
            .expect(200)
            .end((err, res) => {
              if (err) return done(err);
              expect(res.body.length).to.equal(0);
              done();
            });
        });
    });
  });

});
