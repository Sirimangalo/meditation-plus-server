import User from '../models/user.model.js';
import meditatedRecently from './meditatedRecently.js';

export default (app, router, io, admin) => {

  function meditatedRecently(user) {
    if (!user || !'lastMeditation' in user || !user.lastMeditation instanceof Date) {
      return false;
    }

    // calculate hours since last meditation
    let diff = Math.abs(new Date().getTime() - user.lastMeditation) / 36e5;

    if (diff <= 3) {
      return true
    }

    return false;
  }

  /**
   * @api {get} /api/user Get user data
   * @apiName ListUser
   * @apiGroup User
   *
   * @apiSuccess {Object[]} users             List of user slots
   */
  router.get('/api/user', admin, async (req, res) => {
    try {
      const result = await User
        .find()
        .exec();

      res.json(result);
    } catch (err) {
      res.status(400).send(err);
    }
  });

  /**
   * @api {get} /api/user/online Get online user data
   * @apiName ListOnlineUser
   * @apiGroup User
   *
   * @apiSuccess {Object[]} users List of online user
   */
  router.get('/api/user/online', async (req, res) => {
    try {
      const result = await User
        .find({
          lastActive: { $gt: Date.now() - 120000 }
        }, 'name gravatarHash _id lastMeditation')
        .lean()
        .exec();

      res.json(result.map(user => {
        user.meditator = meditatedRecently(user);
        return user;
      }));
    } catch (err) {
      res.status(400).send(err);
    }
  });

  /**
   * @api {post} /api/user/seach Searches users
   * @apiName SearchUser
   * @apiGroup User
   *
   * @apiSuccess {Object[]} users Search result
   */
  router.post('/api/user/search', admin, async (req, res) => {
    try {
      const regex = new RegExp(`.*${req.body.term}.*`, 'i');
      const result = await User
        .find({
          $or: [
            {'name': regex},
            {'local.email': regex}
          ]
        })
        .exec();

      res.json(result);
    } catch (err) {
      res.status(400).send(err);
    }
  });

   /**
   * @api {get} /api/user/:id Get single user
   * @apiName GetUser
   * @apiGroup User
   */
  router.get('/api/user/:id', admin, async (req, res) => {
    try {
      const result = await User
        .findOne({ _id: req.params.id })
        .then();

      res.json(result);
    } catch (err) {
      res.send(err);
    }
  });

   /**
   * @api {put} /api/user/:id Update user
   * @apiName UpdateUser
   * @apiGroup User
   */
  router.put('/api/user/:id', admin, async (req, res) => {
    try {
      let user = await User.findById(req.params.id);

      // change password if set
      if (req.body.newPassword) {
        user.local.password = user.generateHash(req.body.newPassword);
        delete req.body.newPassword;
      }

      for (const key of Object.keys(req.body)) {
        user[key] = req.body[key];
      }
      await user.save();

      res.sendStatus(200);
    } catch (err) {
      res.status(400).send(err);
    }
  });

  /**
   * @api {delete} /api/user/:id Deletes user
   * @apiName DeleteUser
   * @apiGroup User
   */
  router.delete('/api/user/:id', admin, async (req, res) => {
    try {
      const result = await User
        .find({ _id: req.params.id })
        .remove()
        .exec();

      res.json(result);
    } catch (err) {
      res.send(err);
    }
  });
};
