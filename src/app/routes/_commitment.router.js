import Commitment from '../models/commitment.model.js';

export default (app, router) => {

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
        .populate('users', 'local.username profileImageUrl')
        .lean()
        .then();

      res.json(result);
    } catch (err) {
      res.send(err);
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
};
