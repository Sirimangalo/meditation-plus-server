import Question from '../models/question.model.js';
import Broadcast from '../models/broadcast.model.js';
import youtubeHelper from '../helper/youtube.js';
import { logger } from '../helper/logger.js';
import push from '../helper/push.js';

export default (app, router, io, admin) => {

  /**
   * @api {get} /api/question Get questions
   * @apiName ListQuestions
   * @apiGroup Question
   *
   * @apiSuccess {Object[]} questions              List of questions
   * @apiSuccess {String}   questions.text         Question text
   * @apiSuccess {Date}     questions.createdAt    Date of creation
   * @apiSuccess {String}   questions.ago          Relative time of creation as string
   * @apiSuccess {String}   questions.answered     Is question already answered
   * @apiSuccess {Date}     questions.answeredAt   When the question was answered
   * @apiSuccess {Number}   questions.likes        Count of likes
   * @apiSuccess {Number}   questions.alreadyLiked Current user gave like?
   * @apiSuccess {User}     questions.user         The posting user
   */
  router.get('/api/question', async (req, res) => {
    try {
      const perPage = 10;
      const filterAnswered = req.query.filterAnswered === 'true';
      const sortBy = req.query.sortBy ? req.query.sortBy : 'answeredAt';
      const sortOrder = req.query.sortOrder ? req.query.sortOrder : 'descending';
      const linkOnly = req.query.linkOnly ? req.query.linkOnly === 'true' : false;
      const textSearch = req.query.search ? req.query.search : '';
      const page = req.query.page || 0;

      let answeredQuery = {
        answered: true
      };

      if (linkOnly) {
        answeredQuery.broadcast = { $exists: true };
      }

      if (textSearch) {
        answeredQuery['$text'] = { $search: textSearch };
      }

      const query = filterAnswered
        ? Question
          .find(answeredQuery)
          .limit(perPage)
          .skip(perPage * page)
        : Question
          .find({answered: { $ne: true }});

      let questions = await query
        .sort(
          filterAnswered
            ? [[sortBy, sortOrder]]
            : [['numOfLikes', 'descending'], ['createdAt', 'ascending']]
        )
        .populate('user', 'name gravatarHash lastMeditation country username')
        .populate('broadcast', 'started videoUrl')
        .lean()
        .then();

      questions.map(question => {
        for (let like of question.likes) {
          if (like.toString() === req.user._doc._id) {
            question.alreadyLiked = true;
            break;
          }
        }

        return question;
      });

      res.json(questions);
    } catch (err) {
      res.status(500).send(err);
    }
  });

  /**
   * @api {post} /api/question/suggestions Get suggestions for question text from other questions and youtube video search
   * @apiName SuggestQuestions
   * @apiGroup Question
   *
   * @apiParam {String} text Question body
   *
   * @apiSuccess {Object[]} suggestions            List of suggestions
   * @apiSuccess {Array}    suggestions.questions  List of related questions (already answered, with video link)
   * @apiSuccess {Array}    suggestions.youtube    List of related Youtube videos
   */
  router.post('/api/question/suggestions', async (req, res) => {
    // requires index: db.getCollection('questions').createIndex( { text: "text" } )
    try {
      const keywords = req.body.text.match(/\w+/g);
      const youtubeData = await youtubeHelper.findMatchingVideos(keywords.join('|'), 8);
      const questionsData = await Question
        .find({
          answered: true,
          $text: {
            $search: req.body.text,
          }
        })
        .limit(5)
        .populate('user', 'name gravatarHash lastMeditation country username')
        .populate('broadcast', 'started videoUrl')
        .lean()
        .then();

      let youtube = youtubeData.items
        .filter(data => data.id
          && data.id.videoId
          && data.snippet
          && data.snippet.title
          && data.snippet.description
          && data.snippet.thumbnails
          && data.snippet.thumbnails.default
        )
        .map(data => {
          return {
            title: data.snippet.title,
            description: data.snippet.description,
            thumbnail: data.snippet.thumbnails.default,
            videoId: data.id.videoId
          };
        });

      let questions = questionsData
        .filter(data => data.broadcast && data.broadcast.videoUrl);

      res.json({
        youtube: youtube,
        questions: questions
      });
    } catch (err) {
      res.status(500).send(err);
    }
  });

  /**
   * @api {post} /api/question Post a new question
   * @apiName AddQuestion
   * @apiGroup Question
   *
   * @apiParam {String} text Question body
   */
  router.post('/api/question', async (req, res) => {
    try {
      let question = await Question.create({
        text: req.body.text,
        user: req.user._doc
      });

      // add user details for response and broadcast
      await question.populate(
        'user',
        'name gravatarHash country lastMeditation'
      ).execPopulate();

      // sending broadcast WebSocket question & send update for question counter
      io.sockets.emit('question', 1);

      res.sendStatus(204);
    } catch (err) {
      res
        .status(err.name === 'ValidationError' ? 400 : 500)
        .send(err);
    }
  });

  /**
   * @api {post} /api/question/:id/like Add +1 to a question
   * @apiName LikeQuestion
   * @apiGroup Question
   *
   * @apiParam {String} id ObjectID of the question
   */
  router.post('/api/question/:id/like', async (req, res) => {
    try {
      let entry = await Question.findById(req.params.id);
      if (entry.user == req.user._doc._id || entry.answered || entry.answeredAt) {
        return res.sendStatus(400);
      }

      // add like
      if (typeof entry.likes === 'undefined') {
        entry.likes = [];
      }

      // check if already liked
      for (let like of entry.likes) {
        if (like === req.user._doc._id) {
          return res.sendStatus(400);
        }
      }

      entry.numOfLikes = entry.numOfLikes ? entry.numOfLikes + 1 : 1;
      entry.likes.push(req.user._doc);
      await entry.save();

      // sending broadcast WebSocket question
      io.sockets.emit('question', 0);

      res.sendStatus(204);
    } catch (err) {
      res.status(500).send(err);
    }
  });

  /**
   * @api {post} /api/question/:id/answer Answer question
   * @apiName AnswerQuestion
   * @apiGroup Question
   *
   * @apiParam {String} id ObjectID of the question
   */
  router.post('/api/question/:id/answer', async (req, res) => {
    try {
      let entry = await Question.findById(req.params.id);
      if (entry.answered || entry.answeredAt) {
        return res.sendStatus(400);
      }

      if (req.user._doc.role !== 'ROLE_ADMIN') {
        res.sendStatus(403);
        return;
      }

      entry.answered = true;
      entry.answeredAt = new Date();
      await entry.save();

      // sending broadcast WebSocket question & send update for question counter
      io.sockets.emit('question', -1);

      // send push message to author of the question
      push.send({
        _id: entry.user
      }, {
        title: 'Question Answered',
        body: 'A question you have asked was answered just now.',
        data: {
          url: '/home;tab=ask'
        }
      });

      res.sendStatus(204);
    } catch (err) {
      res.status(500).send(err);
    }
  });

  /**
   * @api {post} /api/question/:id/answering Start answering a question
   * @apiName AnsweringQuestion
   * @apiGroup Question
   *
   * @apiParam {String} id ObjectID of the question
   */
  router.post('/api/question/:id/answering', admin, async (req, res) => {
    try {
      let entry = await Question.findById(req.params.id);
      if (entry.answeringAt || entry.answered || entry.answeredAt) {
        return res.sendStatus(400);
      }

      // check if a broadcast is active
      let broadcast = await Broadcast.findOne({
        'started': { $ne: null },
        'ended': { $eq: null }
      });

      if (broadcast) {
        entry.broadcast = broadcast._id;
      }

      entry.answeringAt = new Date();
      await entry.save();

      // sending broadcast WebSocket question
      io.sockets.emit('question', 0);

      res.sendStatus(204);
    } catch (err) {
      logger.error(err);
      res.status(500).send(err);
    }
  });

  /**
   * @api {post} /api/question/:id/unanswering Cancel answering a question
   * @apiName CancelAnsweringQuestion
   * @apiGroup Question
   *
   * @apiParam {String} id ObjectID of the question
   */
  router.post('/api/question/:id/unanswering', admin, async (req, res) => {
    try {
      let entry = await Question.findById(req.params.id);
      if (!entry.answeringAt || entry.answered || entry.answeredAt) {
        return res.sendStatus(400);
      }

      entry.broadcast = null;
      entry.answeringAt = null;

      await entry.save();

      // sending broadcast WebSocket question
      io.sockets.emit('question', 0);

      res.sendStatus(204);
    } catch (err) {
      res.status(500).send(err);
    }
  });

  /**
   * @api {delete} /api/question/:id Deletes question
   * @apiName DeleteQuestion
   * @apiGroup Question
   *
   * @apiParam {String} id ObjectID of the question
   */
  router.delete('/api/question/:id', async (req, res) => {
    try {
      const result = await Question
        .find({ _id: req.params.id })
        .exec();

      if (req.user._doc.role !== 'ROLE_ADMIN'
        && result[0].user != req.user._doc._id) {
        return res.sendStatus(403);
      }

      await Question.remove({ _id: req.params.id }).exec();

      // sending broadcast WebSocket question & send update for question counter
      io.sockets.emit('question', -1);

      res.sendStatus(204);
    } catch (err) {
      res.status(500).send(err);
    }
  });

  /**
   * @api {get} /api/question/count Get count of unanswered questions
   * @apiName CountQuestion
   * @apiGroup Question
   *
   * @apiParam {Number} count Number of unanswered questions
   */
  router.get('/api/question/count', async (req, res) => {
    try {
      const count = await Question
        .find({
          answered: false
        })
        .count();

      res.json(count);
    } catch (err) {
      res.sendStatus(500);
    }
  });
};
