import User from '../models/user.model.js';

export default (app, router) => {

  /**
   * @api {get} /api/profile Get profile details
   * @apiName GetProfile
   * @apiGroup Profile
   * @apiDescription Get the profile data of the currently logged in user.
   *
   * @apiSuccess {Object}     local           Details for local authentication
   * @apiSuccess {String}     local.username  Username
   * @apiSuccess {String}     local.email     Email address
   * @apiSuccess {Boolean}    showEmail       Show email publicly
   * @apiSuccess {String}     description     Profile description
   * @apiSuccess {String}     website         Website
   * @apiSuccess {String}     country         Country
   * @apiSuccess {String}     profileImageUrl   The url of the profile image
   */
  router.get('/api/profile', (req, res) => {
    User
      .findOne({
        _id: req.user._doc._id
      })
      .lean()
      .exec((err, doc) => {
        if (err) return res.status(400).send(err);
        delete doc.local['password'];
        delete doc['__v'];
        return res.json(doc);
      });
  });

  /**
   * @api {get} /api/profile/:username Get profile details of a user
   * @apiName ShowProfile
   * @apiGroup Profile
   * @apiDescription Get the profile data of a user.
   *
   * @apiSuccess {Object}     local           Details for local authentication
   * @apiSuccess {String}     local.username  Username
   * @apiSuccess {String}     local.email     Email address (if public)
   * @apiSuccess {String}     description     Profile description
   * @apiSuccess {String}     website         Website
   * @apiSuccess {String}     country         Country
   * @apiSuccess {String}     profileImageUrl   The url of the profile image
   */
  router.get('/api/profile/:username', (req, res) => {
    User
      .findOne({
        'local.username': req.params.username
      })
      .lean()
      .exec((err, doc) => {
        if (err) return res.status(400).send(err);
        if (!doc) return res.sendStatus(404);
        delete doc.local['password'];
        delete doc['__v'];
        if (!doc.showEmail) {
          delete doc.local['email'];
        }
        return res.json(doc);
      });
  });

  /**
   * @api {put} /api/profile Update profile
   * @apiName UpdateProfile
   * @apiGroup Profile
   * @apiDescription Updating the profile of the currently logged in user.
   *
   * @apiParam {Boolean}    showEmail       Show email publicly
   * @apiParam {String}     description     Profile description
   * @apiParam {String}     website         Website
   * @apiParam {String}     country         Country
   * @apiParam {String}     profileImageUrl   The url of the profile image
   */
  router.put('/api/profile', (req, res) => {
    // remove readonly data
    if (req.body.local) delete req.body.local;
    if (req.body._id) delete req.body._id;

    User.findOneAndUpdate(req.user._doc._id, req.body, {}, (err, doc) => {
      if (err) return res.status(400).send(err);
      return res.sendStatus(200);
    });
  });
};