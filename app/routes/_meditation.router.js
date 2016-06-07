import Meditation from '../models/meditation.model.js';
import moment from 'moment';

export default (app, router, io) => {

  /**
   * @api {get} /api/meditation Get meditation data of last two hours
   * @apiName ListMeditations
   * @apiGroup Meditation
   *
   * @apiSuccess {Object[]} meditations             List of recent sessions
   * @apiSuccess {Number}   meditations.walking     Time of walking
   * @apiSuccess {Number}   meditations.sitting     Time of sitting
   * @apiSuccess {Date}     meditations.end         End of meditation
   * @apiSuccess {Date}     meditations.createdAt   Start of meditation
   * @apiSuccess {Object}   meditations.user        The meditating User
   * @apiSuccess {Number}   meditations.walkingLeft Remaining minutes of walking
   * @apiSuccess {Number}   meditations.sittingLeft Remaining minutes of sitting
   * @apiSuccess {String}   meditations.status      "walking", "sitting" or "done"
   * @apiSuccess {Number}   meditations.likes       Count of +1s
   */
  router.get('/api/meditation', (req, res) => {
    Meditation
      .find({
        // two hours in ms
        end: { $gt: Date.now() - 7.2E6 }
      })
      .populate('user', 'local.username profileImageUrl')
      .lean()
      .exec((err, result) => {
        if(err) {
          res.send(err);
          return;
        }

        // Add remaining walking and sitting time to entries
        result.map((entry) => {
          // calculate remaining time
          let timeElapsed = Math.floor((new Date().getTime() - entry.createdAt) / 1000 / 60);

          // calculate remaining walking time
          let walkingLeft = entry.walking - timeElapsed;
          if (walkingLeft < 0)
            walkingLeft = 0;
          entry.walkingLeft = walkingLeft;

          // calculate remaining sitting time
          let sittingLeft = walkingLeft === 0 ? entry.walking + entry.sitting - timeElapsed : entry.sitting;
          if (sittingLeft < 0)
            sittingLeft = 0;
          entry.sittingLeft = sittingLeft;

          // calculate current status
          if (walkingLeft > 0) {
            entry.status = 'walking';
          } else if (sittingLeft > 0) {
            entry.status = 'sitting';
          } else {
            entry.status = 'done';
          }

          // just return like
          entry.likes = entry.likes.length;

          return entry;
        });

        res.json(result);
      });
  });

  /**
   * @api {post} /api/meditation Start a new meditation session
   * @apiName AddMeditation
   * @apiGroup Meditation
   *
   * @apiParam {Number} sitting Sitting time
   * @apiParam {Number} walking Walking time
   */
  router.post('/api/meditation', (req, res) => {
    // parse input and normalize
    let walking = req.body.walking ? parseInt(req.body.walking, 10) : 0;
    if (walking > 120) walking = 120;
    if (walking < 0) walking = 0;
    let sitting = req.body.sitting ? parseInt(req.body.sitting, 10) : 0;
    if (sitting > 120) sitting = 120;
    if (sitting < 0) sitting = 0;
    let total = sitting + walking;

    // check if user is already meditating
    Meditation.findOne({
      end: { $gt: Date.now() },
      user: req.user._doc._id
    }).exec((err, meditation) => {
      if (meditation) {
        // user is already meditation
        // --> delete entry
        meditation.remove((err, removed) => {
          if (err) res.send(500, err);
        });
      }

      Meditation.create({
        sitting: sitting,
        walking: walking,
        end: new Date(new Date().getTime() + total * 60000),
        user: req.user._doc
      }, (err, meditation) => {
        if (err) {
          res.status(400).send(err);
        }

        // sending broadcast WebSocket meditation
        io.sockets.emit('meditation', 'no content');

        res.json(meditation);
      });

    });


  });

  /**
   * @api {post} /api/meditation/like Add +1 to a meditation session
   * @apiName LikeMeditation
   * @apiGroup Meditation
   *
   * @apiParam {String} session ObjectID of the meditation session
   */
  router.post('/api/meditation/like', (req, res) => {
    Meditation.findById(req.body.session, (err, entry) => {
      if (err || entry.user == req.user._doc._id) {
        if (err) {
          res.status(400).send(err)
          return;
        }

        res.sendStatus(400);
        return;
      }

      // check if already liked
      for (let like of entry.likes) {
        if (like == req.user._doc._id) {
          console.log('already liked');
          res.sendStatus(400);
          return;
        }
      }

      // add like
      if (typeof entry.likes === 'undefined') {
        entry.likes = [];
      }
      entry.likes.push(req.user._doc);
      entry.save((err) => {
        if (err) {
          res.status(500).send(err);
        }
        // sending broadcast WebSocket meditation
        io.sockets.emit('meditation', 'no content');

        res.sendStatus(204);
      });
    });
  });

  /**
   * @api {get} /api/meditation/times Get meditation minutes per hour
   * @apiName GetMeditationTimes
   * @apiGroup Meditation
   * @apiDescription Meditation minues per day hour of the last 30 days.
   *
   * @apiSuccess {Object[]} meditationTimes Assoc. array of meditation times
   */
  router.get('/api/meditation/times', (req, res) => {
    Meditation
      .find({
        // 30 days in ms
        end: { $gt: Date.now() - 2.592E9 }
      })
      .lean()
      .exec((err, result) => {
        if(err) {
          res.send(err);
          return;
        }

        // initialize times
        let times = {};
        for (let i = 0; i < 24; i++) {
          times[i] = 0;
        }

        // Sum meditation times
        result.map((entry) => {
          times[moment(entry.createdAt).format('H')] += entry.sitting + entry.walking;
        });

        res.json(times);
      });
  });
};