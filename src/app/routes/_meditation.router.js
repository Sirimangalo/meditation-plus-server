import Meditation from '../models/meditation.model.js';
import User from '../models/user.model.js';
import moment from 'moment-timezone';
import { logger } from '../helper/logger.js';
import push from '../helper/push.js';

export default (app, router, io) => {

  /**
   * Calculates the remaining meditation time for a session.
   * Adds properties sittingLeft, walkingLeft and status.
   *
   * @param  {Meditation} entry Meditation object
   * @return {Meditation}       Modified meditation object
   */
  function calculateRemainingTime(entry) {
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

    return entry;
  }

  /**
   * Checks for conflicting meditation data.
   * @param  {Number} userId          User id
   * @param  {Date}   first           First date of timespan
   * @param  {Date}   last            Last date of timespan
   * @return {Meditation|null}        Found session data
   */
  async function findConflictingMeditation(userId, first, last) {
    return await Meditation
      .findOne({
        user: userId,
        $or: [
          {
            'createdAt': { $lte: first },
            'end': { $gte: first }
          },
          {
            'createdAt': { $lte: last },
            'end': { $gte: last }
          }
        ]
      })
      .exec();
  }

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
   * @apiSuccess {Number}   meditations.numOfLikes  Count of +1s
   */
  router.get('/api/meditation', async (req, res) => {
    try {
      let result = await Meditation
        .find({
          // three hours in ms
          end: { $gt: Date.now() - 1.08E7 }
        })
        .sort([['createdAt', 'descending']])
        .populate('user', 'name gravatarHash country username')
        .lean()
        .exec();

      // Add remaining walking and sitting time to entries
      res.json(result.map(calculateRemainingTime));
    } catch (err) {
      res.send(err);
    }
  });

  /**
   * @api {post} /api/meditation Start a new meditation session
   * @apiName AddMeditation
   * @apiGroup Meditation
   *
   * @apiParam {Number} sitting Sitting time
   * @apiParam {Number} walking Walking time
   */
  router.post('/api/meditation', async (req, res) => {
    // parse input and normalize
    let walking = req.body.walking ? parseInt(req.body.walking, 10) : 0;
    if (walking > 240) walking = 240;
    if (walking < 0) walking = 0;
    let sitting = req.body.sitting ? parseInt(req.body.sitting, 10) : 0;
    if (sitting > 240) sitting = 240;
    if (sitting < 0) sitting = 0;
    let total = sitting + walking;

    try {
      // check if user is already meditating
      const meditation = await Meditation
        .findOne({
          end: { $gt: Date.now() },
          user: req.user._id
        })
        .exec();

      if (meditation) {
        // user is already meditation
        // --> delete entry
        await meditation.remove();
      }

      let medStart = new Date();
      let medEnd = new Date(new Date().getTime() + total * 60000);

      // check if custom session start date/time was requested
      if (req.body.start) {
        let newStart = moment.utc(req.body.start).toDate();
        let newEnd = moment.utc(req.body.start).add(total, 'minutes').toDate();

        // check if date is valid
        if (isNaN(newEnd.getTime()) || newEnd >= moment.utc()) {
          return res.status(400).json({errMsg: 'The date is invalid.'});
        }

        // check if date is not older than 30 days
        if (newEnd < moment.utc().subtract(30, 'days')) {
          return res.status(400).json({errMsg: 'The date is older than 30 days.'});
        }

        // check if new session time conflicts with existing sessions
        let conflict = await findConflictingMeditation(req.user._id, newStart, newEnd);

        if (conflict) {
          return res.status(400).json({errMsg: 'There exists a meditation entry that conflicts with your date/time.'});
        }

        // set custom session date
        medStart = newStart;
        medEnd = newEnd;
      }

      const created = await Meditation.create({
        sitting: sitting,
        walking: walking,
        createdAt: medStart,
        end: medEnd,
        user: req.user,
        numOfLikes: 0
      });

      let user = await User.findById(req.user._id);

      // update users lastMeditation log
      user.lastMeditation = created.end;
      await user.save();

      // sending broadcast WebSocket meditation
      io.sockets.emit('meditation', 'no content');

      // setup PUSH notification if allowed
      if (!req.body.start && user.notifications.meditation) {
        if (walking) {
          setTimeout(() => {
            // check if meditation has been stopped
            Meditation
              .findOne({ _id: created._id })
              .then(doc => {
                if (doc && doc.walking == walking) {
                  push.send({
                    _id: user._id
                  }, {
                    title: 'Walking done',
                    vibrate: [100]
                  });
                }
              });
          }, walking * 60000);
        }

        if (sitting) {
          setTimeout(() => {
            // check if meditation has been stopped
            Meditation
              .findOne({ _id: created._id })
              .then(doc => {
                if (doc && doc.sitting == sitting) {
                  push.send({
                    _id: user._id
                  }, {
                    title: 'Sitting done',
                    vibrate: [100]
                  });
                }
              });
          }, (walking + sitting) * 60000);
        }
      }

      res.json(created);
    } catch (err) {
      logger.error(err);
      res
        .status(err.name === 'ValidationError' ? 400 : 500)
        .send(err);
    }
  });

  /**
   * @api {post} /api/meditation/stop Stops a meditation session
   * @apiName StopMeditation
   * @apiGroup Meditation
   */
  router.post('/api/meditation/stop', async (req, res) => {
    try {
      // find user's session
      let meditation = await Meditation
        .findOne({
          end: { $gt: Date.now() },
          user: req.user._id
        })
        .exec();

      if (!meditation) {
        return res.sendStatus(400);
      }

      const oldEnd = moment(meditation.end);
      const newEnd = moment();
      const diff = moment.duration(oldEnd.diff(newEnd));
      let minutes = diff.asMinutes();

      for (; minutes > 0; minutes--) {
        if (meditation.sitting > 0) {
          meditation.sitting--;
        } else {
          meditation.walking--;
        }
      }

      // remove session when time is 0
      if (meditation.walking + meditation.sitting < 1) {
        await meditation.remove();
      } else {
        meditation.end = Date.now();
        await meditation.save();
      }

      // update user's last meditation end to now
      User.findOneAndUpdate({
        _id: req.user._id
      }, {
        lastMeditation: Date.now()
      }).exec();

      // sending broadcast WebSocket meditation
      io.sockets.emit('meditation', 'no content');
      res.sendStatus(204);
    } catch (err) {
      res
        .status(500)
        .send(err);
    }
  });

  /**
   * @api {post} /api/meditation/like Add +1 to a all recent meditation sessions
   * @apiName LikeMeditations
   * @apiGroup Meditation
   */
  router.post('/api/meditation/like', async (req, res) => {
    try {
      let user = await User.findById(req.user._id);

      const lastLike = user.lastLike
        ? user.lastLike.getTime()
        : Date.now() - 2.52E7; // 7 hours

      const result = await Meditation
        .where({
          $and: [
            { end: { $gt: Date.now() - 1.08E7 } },
            { createdAt: { $gt: lastLike } }
          ]
        })
        .setOptions({ multi: true })
        .update({ $inc: { numOfLikes: 1 } })
        .exec();

      user.lastLike = new Date();
      await user.save();

      if (result.nModified > 0) {
        // sending broadcast WebSocket meditation
        io.sockets.emit('meditation', 'no content');
      }

      res.sendStatus(204);
    } catch (err) {
      res.status(500).send(err);
    }
  });

  /**
   * @api {get} /api/meditation/times Get meditation minutes per hour
   * @apiName GetMeditationTimes
   * @apiGroup Meditation
   * @apiDescription Meditation minues per day hour of the last 30 days.
   *
   * @apiSuccess {Object[]} meditationTimes Assoc. array of meditation times
   */
  router.get('/api/meditation/chart', async (req, res) => {
    try {
      const result = await Meditation.aggregate([
        {
          $match: {
            createdAt: {
              $gte: moment.utc().startOf('day').toDate()
            }
          }
        },
        {
          $group: {
            _id: { $hour: '$createdAt' },
            total: { $sum: { $add: ['$walking', '$sitting'] } }
          }
        },
        {
          $sort: {
            _id: 1
          }
        }
      ]);

      res.json(result);
    } catch (err) {
      res.send(err);
    }
  });
};
