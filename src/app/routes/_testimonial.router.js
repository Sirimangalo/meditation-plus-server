import Testimonial from '../models/testimonial.model.js';

import moment from 'moment';

export default (app, router, io, admin) => {

  /**
   * @api {get} /api/testimonial Get all testimonials
   * @apiName ListTestimonials
   * @apiGroup Testimonial
   *
   * @apiSuccess {Object[]} testimonials            List of available testimonials
   * @apiSuccess {String}   commitments.user        User details
   * @apiSuccess {Boolean}  allowUser               Current user allowed to post?
   */
  router.get('/api/testimonial', async (req, res) => {
    try {
      let userId = req.user._doc._id;
      let allowUser = true;
      let testimonials = await Testimonial
        .find()
        .sort([['createdAt', 'descending']])
        .populate('user', 'name gravatarHash')
        .lean()
        .then();

      testimonials = testimonials.filter(test => {
          if (test.user._id == userId) {
            allowUser = false;
          }

          test.user = test.anonymous ? { name : 'Anonymous' } : test.user;

          return test.reviewed;
      });

      res.json({
        allowUser: allowUser,
        testimonials: testimonials
      });
    } catch (err) {
      res.status(500).send(err);
    }
  });

  router.get('/api/testimonial/admin', admin, async (req, res) => {
    try {
      let testimonials = await Testimonial
        .find()
        .sort([['createdAt', 'descending']])
        .populate('user', 'name gravatarHash')
        .lean()
        .then();

      res.json({
        testimonials: testimonials
      });
    } catch (err) {
      res.status(500).send(err);
    }
  });

  /**
   * @api {post} /api/testimonial Adds new testimonial
   * @apiName AddTestimonial
   * @apiGroup Testimonial
   */
  router.post('/api/testimonial', async (req, res) => {
    try {
      let testimonial = await Testimonial.create({
        text: req.body.text,
        user: req.user._doc,
        reviewed: false, // default: false
        anonymous: req.body.anonymous || false
      });

      // add user details for response and broadcast
      let populated = await testimonial.populate(
        'user',
        'name gravatarHash'
      ).execPopulate();

      let leanObject = populated.toObject();

      // sending broadcast WebSocket testimonial
      io.sockets.emit('testimonial', leanObject);

      res.json(leanObject);
    } catch (err) {
      let errStatus = 500;

      if (err.name == 'ValidationError' || err.name == 'MongoError'){
        errStatus = 400;
      }

      res
        .status(errStatus)
        .send(err);
    }
  });



  router.put('/api/testimonial', async (req, res) => {
    try {
      let testimonial = await Testimonial.findById(req.body.id);

      testimonial.reviewed = !testimonial.reviewed;
      
      await testimonial.save();

      res.sendStatus(200);
    } catch (err) {
      res.status(400).send(err);
    }
  });

  router.delete('/api/testimonial/:id', admin, async (req, res) => {
    try {
      const result = await Testimonial
        .find({ _id: req.params.id })
        .remove()
        .exec();

      res.json(result);
    } catch (err) {
      res.send(err);
    }
  });

};
