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
    let user = req.user._doc;
    delete user.local['password'];
    delete user['__v'];
    res.json(user);
  });

  /**
   * @api {put} /api/profile Update profile
   * @apiName UpdateProfile
   * @apiGroup Profilei
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

      console.log('updated user', req.user._doc._id, 'with', req.body);
      return res.sendStatus(200);
    });
  });
};