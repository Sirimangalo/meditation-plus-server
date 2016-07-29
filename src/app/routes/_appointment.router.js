import Appointment from '../models/appointment.model.js';

export default (app, router, io, admin) => {

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
        .sort({
          hour: 'asc'
        })
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
      console.log('Appointment Error', err);
      res.status(400).send(err);
    }
  });

   /**
   * @api {get} /api/appointment/:id Get single appointment
   * @apiName GetAppointment
   * @apiGroup Appointment
   *
   * @apiSuccess {Number}   weekDay        1 to 7
   * @apiSuccess {Number}   hour           UTC hour
   */
  router.get('/api/appointment/:id', admin, async (req, res) => {
    try {
      const result = await Appointment
        .findOne({ _id: req.params.id })
        .lean()
        .then();

      res.json(result);
    } catch (err) {
      res.send(err);
    }
  });

   /**
   * @api {put} /api/appointment/:id Update appointment
   * @apiName UpdateAppointment
   * @apiGroup Appointment
   */
  router.put('/api/appointment/:id', admin, async (req, res) => {
    try {
      let appointment = await Appointment.findById(req.params.id);
      for (const key of Object.keys(req.body)) {
        appointment[key] = req.body[key];
      }
      await appointment.save();

      res.sendStatus(200);
    } catch (err) {
      res.status(400).send(err);
    }
  });

  /**
   * @api {post} /api/appointment Add new appointment
   * @apiName AddAppointment
   * @apiGroup Appointment
   */
  router.post('/api/appointment', admin, async (req, res) => {
    try {
      let appointment = await Appointment.create({
        weekDay: req.body.weekDay,
        hour: req.body.hour
      });

      res.sendStatus(201);
    } catch (err) {
      res
        .status(err.name === 'ValidationError' ? 400 : 500)
        .send(err);
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

  /**
   * @api {delete} /api/appointment/:id Deletes appointment
   * @apiName DeleteAppointment
   * @apiGroup Appointment
   */
  router.delete('/api/appointment/:id', admin, async (req, res) => {
    try {
      const result = await Appointment
        .find({ _id: req.params.id })
        .remove()
        .exec();

      res.json(result);
    } catch (err) {
      res.send(err);
    }
  });
};