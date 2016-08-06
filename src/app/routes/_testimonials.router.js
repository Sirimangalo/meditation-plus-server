import Testimonial from '../models/testimonials.model.js';

import moment from 'moment';

export default (app, router, io) => {

  router.get('/api/testimonials', async (req, res) => {
    try {
      let testimonials = await Testimonial
        .find({
          'reviewed' : true
        })
        .populate('user', 'name gravatarHash')
        .lean()
        .then();

      testimonials = testimonials
        .map(testimonial => {
          testimonial.date = moment(testimonial.createdAt).format('D. MMMM Y');
          if (testimonial.anonymous) {
            testimonial.user = { name : 'Anonymous' };
          }
          return testimonial;
        })
        .reverse();

      res.json(testimonials);
    } catch (err) {
      res.status(500).send(err);
    }
  });

  router.post('/api/testimonials', async (req, res) => {
    try {
      let testimonial = await Testimonial.create({
        text: req.body.text,
        user: req.user._doc,
        reviewed: false,
        anonymous: req.body.anonymous || false
      });

      // add user details for response and broadcast
      let populated = await testimonial.populate(
        'user',
        'name gravatarHash'
      ).execPopulate();


      let leanObject = populated.toObject();
      // leanObject.ago = moment(leanObject.createdAt).fromNow();

      // sending broadcast WebSocket testimonial
      io.sockets.emit('testimonial', leanObject);

      res.json(leanObject);
    } catch (err) {
      res
        .status(err.name === 'ValidationError' ? 400 : 500)
        .send(err);
    }
  });

};
