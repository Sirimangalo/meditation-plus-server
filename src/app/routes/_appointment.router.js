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
  router.get('/api/appointment', async (req, res) => {
    try {
      let json = {
        hours: [],
        appointments: []
      };
      const result = await Appointment
        .find()
        .populate('user', 'local.username profileImageUrl')
        .lean()
        .exec();

      result.map(entry => {
        if (!json.hours.includes(entry.hour)) {
          json.hours.push(entry.hour);
        }
        json.appointments.push(entry);
      });

      res.json(json);
    } catch (err) {
      res.status(400).send(err);
    }
  });

  /**
   * @api {post} /api/appointment Toggle registration to appointment
   * @apiName ToggleAppointmentRegistration
   * @apiGroup appointment
   *
   * @apiParam {String} id Appointment ID
   */
  router.post('/api/appointment/:id/register', async (req, res) => {
    try {
      // check if user is already meditating
      let appointment = await Appointment
        .findById(req.params.id)
        .exec();

      if (!appointment) return res.sendStatus(404);

      // check if another user is registered
      if (appointment.user && appointment.user != req.user._doc._id) {
        return res.status(400).send('another user is registered');
      }

      // toggle registration for current user
      appointment.user = appointment.user
        && appointment.user == req.user._doc._id
        ? null
        : req.user._doc;

      await appointment.save();
      // sending broadcast WebSocket for taken/fred appointment
      io.sockets.emit('appointment', appointment);

      res.sendStatus(204);
    } catch (err) {
      res.status(400).send(err);
    }
  });
};
