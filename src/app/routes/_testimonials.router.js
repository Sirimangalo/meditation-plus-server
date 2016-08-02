import Testimonial from '../models/testimonials.model.js';

import moment from 'moment';

export default (app, router, io) => {

  router.get('/api/testimonials', async (req, res) => {
    try {
      let testimonials = await Testimonial
        .find({
          'reviewed' : true
        })
        .populate('user', 'local.username profileImageUrl')
        .lean()
        .then();

      testimonials.map(testimonial => {
        testimonial.date = moment(testimonial.createdAt).format('D. MMMM Y');
        return testimonial;
      });

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
        anonymous: req.body.anonymous,
        reviewed: false
      });

      // add user details for response and broadcast
      let populated = await testimonial.populate(
        'user',
        'local.username profileImageUrl'
      ).execPopulate();

      let leanObject = populated.toObject();
      leanObject.ago = moment(leanObject.createdAt).fromNow();

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
