import Broadcast from '../models/broadcast.model.js';
import youtubeHelper from '../helper/youtube.js';

export default (app, router, admin) => {

  /**
   * Repetetly checks for a broadcast record on youtube being published.
   * Adds link to broadcast if it finds the processed video.
   *
   * @param  {Broadcast} broadcast  Model of broadcast without link
   */
  async function checkBroadcastLink(broadcast, currentTry = 0) {
    // Check every 30 minutes, max. 5 times
    const interval = 1800000;
    const maxTries = 5;
    const findBroadcast = await youtubeHelper.findBroadcastURL(broadcast);

    if (findBroadcast.items && findBroadcast.items.length !== 0) {
      broadcast.videoUrl = 'https://www.youtube.com/watch?v=' + findBroadcast.items[0].id.videoId;
      await broadcast.save();
    }

    if (!broadcast.videoUrl && currentTry < maxTries) {
      setTimeout(() => {
        checkBroadcastLink(broadcast, currentTry + 1);
      }, interval);
    }
  }

  /**
   * @api {get} /api/broadcast Get broadcast data
   * @apiName ListBroadcast
   * @apiGroup broadcast
   *
   * @apiSuccess {Object[]} broadcasts             List of broadcast slots
   * @apiSuccess {Number}   broadcasts.ended       End time
   * @apiSuccess {Number}   broadcasts.started     Start time
   * @apiSuccess {Object}   broadcasts.videoUrl    Youtube url
   */
  router.get('/api/broadcast', async (req, res) => {
    try {
      const result = await Broadcast
        .find()
        .sort({
          createdAt: 'desc'
        })
        .limit(20)
        .exec();

      res.json(result);
    } catch (err) {
      console.log('Broadcast Error', err);
      res.status(400).send(err);
    }
  });

   /**
   * @api {get} /api/broadcast/:id Get single broadcast
   * @apiName GetBroadcast
   * @apiGroup Broadcast
   *
   * @apiSuccess {Date}     started
   * @apiSuccess {Date}     end
   * @apiSuccess {String}   url
   */
  router.get('/api/broadcast/:id', admin, async (req, res) => {
    try {
      const result = await Broadcast
        .findOne({ _id: req.params.id })
        .lean()
        .then();

      res.json(result);
    } catch (err) {
      res.send(err);
    }
  });

   /**
   * @api {put} /api/broadcast/:id Update broadcast
   * @apiName UpdateBroadcast
   * @apiGroup Broadcast
   */
  router.put('/api/broadcast/:id', admin, async (req, res) => {
    try {
      let broadcast = await Broadcast.findById(req.params.id);

      for (const key of Object.keys(req.body)) {
        broadcast[key] = req.body[key];

      }
      await broadcast.save();

      if (broadcast.ended && !broadcast.videoUrl) {
        checkBroadcastLink(broadcast);
      }

      res.sendStatus(200);
    } catch (err) {
      res.status(400).send(err);
    }
  });

  /**
   * @api {post} /api/broadcast Add new broadcast
   * @apiName AddBroadcast
   * @apiGroup Broadcast
   */
  router.post('/api/broadcast', admin, async (req, res) => {
    try {
      await Broadcast.create(req.body);

      res.sendStatus(201);
    } catch (err) {
      res
        .status(err.name === 'ValidationError' ? 400 : 500)
        .send(err);
    }
  });

  /**
   * @api {delete} /api/broadcast/:id Deletes broadcast
   * @apiName DeleteBroadcast
   * @apiGroup Broadcast
   */
  router.delete('/api/broadcast/:id', admin, async (req, res) => {
    try {
      const result = await Broadcast
        .find({ _id: req.params.id })
        .remove()
        .exec();

      res.json(result);
    } catch (err) {
      res.send(err);
    }
  });
};
