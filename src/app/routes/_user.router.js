import User from '../models/user.model.js';
import appointHelper from '../helper/appointment.js';

export default (app, router, io, admin) => {

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
      const userIds = Object.keys(io.sockets.sockets)
        .map(s => io.sockets.sockets[s].decoded_token ?
          io.sockets.sockets[s].decoded_token._id
          : null
        );

      const result = await User
        .find({
          _id: { $in: userIds }
        }, 'name gravatarHash _id lastMeditation country username')
        .lean()
        .exec();

      res.json(result);
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
            {'username': regex},
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
   * @api {get} /api/user/username/:username Get single user by username
   * @apiName GetUserByUsername
   * @apiGroup User
   */
  router.get('/api/user/username/:username', admin, async (req, res) => {
    try {
      const result = await User
        .findOne({ username: req.params.username })
        .then();

      res.json(result);
    } catch (err) {
      res.send(err);
    }
  });

  /**
   * @api {get} /api/user/mention/:search Get single username by search string
   * @apiName GetUsernameForMention
   * @apiGroup User
   */
  router.get('/api/user/mention/:search', async (req, res) => {
    try {
      const search = req.params.search ? req.params.search : '';
      const result = await User
        .findOne({ username: new RegExp('^' + search, 'i') })
        .then();

      res.json(result ? result.username : '');
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

      let updatePassword = '';
      // change password if set
      if (req.body.newPassword) {
        updatePassword = user.generateHash(req.body.newPassword);
        delete req.body.newPassword;
      }

      for (const key of Object.keys(req.body)) {
        user[key] = req.body[key];
      }

      if (updatePassword) {
        user.local.password = updatePassword;
      }

      // Send first appointment notification right after updating
      if (user.notifications && user.notifications.appointment) {
        appointHelper.notify().then();
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
