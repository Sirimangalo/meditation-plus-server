import Question from '../models/question.model.js';
import meditatedRecently from '../helper/meditatedRecently.js';
import youtubeHelper from '../helper/youtube.js';
import moment from 'moment';

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
      const filterAnswered = req.query.filterAnswered === 'true';
      const page = req.query.page || 0;

      // paginate by two weeks
      const timespanTo = moment().subtract(2 * page, 'weeks');
      const timespanFrom = moment(timespanTo).subtract(2, 'weeks');

      let questions = await Question
        .find(
          filterAnswered
          ? {
            // filter by paginated timespan
            answeredAt: {
              $gte: timespanFrom.toDate(),
              $lte: timespanTo.toDate()
            }
          }
          : {
            answered: { $ne: true }
          }
        )
        .sort(
          filterAnswered
          ? [['answeredAt', 'descending']]
          : [['numOfLikes', 'descending'], ['createdAt', 'ascending']]
        )
        .populate('user', 'name gravatarHash lastMeditation country')
        .lean()
        .then();

      questions.map(question => {
        if (question.user) {
          question.user.meditator = meditatedRecently(question.user);
        }

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
      let populated = await question.populate(
        'user',
        'name gravatarHash country lastMeditation'
      ).execPopulate();

      // sending broadcast WebSocket question
      io.sockets.emit('question', 'no content');

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

      // check if already liked
      for (let like of entry.likes) {
        if (like == req.user._doc._id) {
          return res.sendStatus(400);
        }
      }

      // add like
      if (typeof entry.likes === 'undefined') {
        entry.likes = [];
      }

      entry.numOfLikes = entry.numOfLikes ? entry.numOfLikes + 1 : 1;
      entry.likes.push(req.user._doc);
      await entry.save();

      // sending broadcast WebSocket question
      io.sockets.emit('question', 'no content');

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

      if (req.user._doc.role !== 'ROLE_ADMIN'
        && entry.user._id === req.user._doc._id) {
        res.sendStatus(403);
        return;
      }

      const youtubeData = await youtubeHelper.getLivestreamInfo();
      // check if broadcast is running and try to set the time this question has been answered
      if (youtubeData.items.length > 0) {
        const stream = youtubeData.items[0];
        const streamStarted = moment(stream.snippet.publishedAt);
        const now = moment();
        const duration = moment.duration(now.diff(streamStarted));

        console.log('Stream Started', streamStarted.toString());
        console.log('Now', now.toString());
        console.log('Diff in s', Math.round(duration.asSeconds()));

        entry.videoUrl = `https://youtu.be/${stream.id.videoId}?t=${Math.round(duration.asSeconds()) - 5}`;
      }
      entry.answered = true;
      entry.answeredAt = new Date();
      await entry.save();

      // sending broadcast WebSocket question
      io.sockets.emit('question', 'no content');

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
        && result.user === req.user._doc._id) {
        return res.sendStatus(403);
      }

      await Question.remove({ _id: req.params.id }).exec();

      // sending broadcast WebSocket question
      io.sockets.emit('question', 'no content');

      res.sendStatus(204);
    } catch (err) {
      res.status(500).send(err);
    }
  });
};
