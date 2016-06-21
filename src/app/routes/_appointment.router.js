import Appointment from '../models/appointment.model.js';

export default (app, router, io) => {

  /**
   * @api {get} /api/appointment Get appointment data
   * @apiName ListAppointment
   * @apiGroup appointment
   *
   * @apiSuccess {Object[]} appointments             List of appointment slots
   * @apiSuccess {Number}   appointments.hour        Hour of day
   * @apiSuccess {Number}   appointments.weekDay     Number of week day
   * @apiSuccess {Object}   appointments.user        The meditating User
   */
  router.get('/api/appointment', (req, res) => {
    appointment
      .find()
      .populate('user', 'local.username profileImageUrl')
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
   * @api {post} /api/appointment Toggle registration to appointment
   * @apiName ToggleAppointmentRegistration
   * @apiGroup appointment
   *
   * @apiParam {String} id Appointment ID
   */
  router.post('/api/appointment/:id/register', (req, res) => {
    // check if user is already meditating
    appointment.findById(req.params('id')).exec((err, appointment) => {
      if (err) {
        res.send(404, err);
        return;
      }

      // check if another user is registered
      if (appointment.user && appointment.user._id !== req.user._doc._id) {
        res.send(400, 'another user is registered');
        return;
      }

      // toggle registration for current user
      appointment.user = appointment.user
        && appointment.user._id === req.user._doc._id
        ? null
        : req.user._doc;

      appointment.save(err => {
        if (err) res.status(500).send(err);
        // sending broadcast WebSocket for taken/fred appointment
        io.sockets.emit('appointment', appoitment)

        res.sendStatus(204);
      });
    });
  });
};