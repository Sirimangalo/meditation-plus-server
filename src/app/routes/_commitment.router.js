import Commitment from '../models/commitment.model.js';

export default (app, router, admin) => {

  /**
   * @api {get} /api/commitment Get all commitments
   * @apiName ListCommitments
   * @apiGroup Commitment
   *
   * @apiSuccess {Object[]} commitments             List of available commitments
   * @apiSuccess {String}   commitments.type        "daily", "weekly", ("monthly")
   * @apiSuccess {Number}   commitments.minutes     Minutes of meditation per type
   * @apiSuccess {User[]}   commitments.users       Committing users
   */
  router.get('/api/commitment', async (req, res) => {
    try {
      const result = await Commitment
        .find()
        .populate('users', 'name gravatarHash')
        .lean()
        .then();

      res.json(result);
    } catch (err) {
      res.send(err);
    }
  });

   /**
   * @api {get} /api/commitment/:id Get single commitment
   * @apiName GetCommitment
   * @apiGroup Commitment
   *
   * @apiSuccess {String}   type        "daily", "weekly", ("monthly")
   * @apiSuccess {Number}   minutes     Minutes of meditation per type
   */
  router.get('/api/commitment/:id', admin, async (req, res) => {
    try {
      const result = await Commitment
        .findOne({ _id: req.params.id })
        .lean()
        .then();

      res.json(result);
    } catch (err) {
      res.send(err);
    }
  });

   /**
   * @api {put} /api/commitment/:id Update commitment
   * @apiName UpdateCommitment
   * @apiGroup Commitment
   */
  router.put('/api/commitment/:id', admin, async (req, res) => {
    try {
      let commitment = await Commitment.findById(req.params.id);
      for (const key of Object.keys(req.body)) {
        commitment[key] = req.body[key];
      }
      await commitment.save();

      res.sendStatus(200);
    } catch (err) {
      res.status(400).send(err);
    }
  });

  /**
   * @api {post} /api/commitment Add new commitment
   * @apiName AddCommitment
   * @apiGroup Commitment
   */
  router.post('/api/commitment', admin, async (req, res) => {
    try {
      await Commitment.create({
        type: req.body.type,
        minutes: req.body.minutes
      });

      res.sendStatus(201);
    } catch (err) {
      res
        .status(err.name === 'ValidationError' ? 400 : 500)
        .send(err);
    }
  });


  /**
   * @api {post} /api/commitment/:id/commit Commit Commitment
   * @apiName CommitCommitment
   * @apiGroup Commitment
   *
   * @apiParam {String} id ObjectID of the Commitment
   */
  router.post('/api/commitment/:id/commit', async (req, res) => {
    try {
      let entry = await Commitment.findById(req.params.id);

      // check if already committed
      for (let user of entry.users) {
        if (user == req.user._doc._id) {
          res.sendStatus(400);
          return;
        }
      }

      // add like
      if (typeof entry.users === 'undefined') {
        entry.users = [];
      }
      entry.users.push(req.user._doc);
      await entry.save();
      res.sendStatus(204);
    } catch (err) {
      res.status(400).send(err);
    }
  });

  /**
   * @api {post} /api/commitment/:id/uncommit Uncommit Commitment
   * @apiName UncommitCommitment
   * @apiGroup Commitment
   *
   * @apiParam {String} id ObjectID of the Commitment
   */
  router.post('/api/commitment/:id/uncommit', async (req, res) => {
    try {
      let entry = await Commitment.findById(req.params.id);

      // find user
      for (let key of entry.users.keys()) {
        if (entry.users[key] == req.user._doc._id) {
          entry.users.splice(key, 1);
          await entry.save();
          res.sendStatus(204);
          return;
        }
      }

      // use not found
      res.sendStatus(400);
    } catch (err) {
      res.status(400).send(err);
    }
  });

  /**
   * @api {delete} /api/commitment/:id Deletes commitment
   * @apiName DeleteCommitment
   * @apiGroup Commitment
   */
  router.delete('/api/commitment/:id', admin, async (req, res) => {
    try {
      const result = await Commitment
        .find({ _id: req.params.id })
        .remove()
        .exec();

      res.json(result);
    } catch (err) {
      res.send(err);
    }
  });
};
