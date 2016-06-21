import Commitment from '../models/commitment.model.js';
import moment from 'moment';

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
  router.get('/api/commitment', (req, res) => {
    Commitment
      .find()
      .populate('users', 'local.username profileImageUrl')
      .lean()
      .exec((err, result) => {
        if(err) {
          res.send(err);
          return;
        }

        res.json(result);
      });
  });

  /**
   * @api {post} /api/commitment/:id/commit Commit Commitment
   * @apiName CommitCommitment
   * @apiGroup Commitment
   *
   * @apiParam {String} id ObjectID of the Commitment
   */
  router.post('/api/commitment/:id/commit', (req, res) => {
    Commitment.findById(req.params.id, (err, entry) => {
      if (err) {
        res.status(400).send(err)
        return;
      }

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
      entry.save((err) => {
        if (err) {
          res.status(500).send(err);
        }

        res.sendStatus(204);
      });
    });
  });

  /**
   * @api {post} /api/commitment/:id/uncommit Uncommit Commitment
   * @apiName UncommitCommitment
   * @apiGroup Commitment
   *
   * @apiParam {String} id ObjectID of the Commitment
   */
  router.post('/api/commitment/:id/uncommit', (req, res) => {
    Commitment.findById(req.params.id, (err, entry) => {
      if (err) {
        res.status(400).send(err)
        return;
      }

      let found = false;

      // find user
      for (let key of entry.users.keys()) {
        if (entry.users[key] == req.user._doc._id) {
          entry.users.splice(key, 1);
          found = true;
          entry.save((err) => {
            if (err) {
              res.status(500).send(err);
            }

            console.log('deleted', entry.users);
            res.sendStatus(204);
          });
          return;
        }
      }

      if (!found) {
        res.sendStatus(400);
      }
    });
  });
};