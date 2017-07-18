import Appointment from '../models/appointment.model.js';
import Settings from '../models/settings.model.js';
import { logger } from '../helper/logger.js';
import moment from 'moment';
import push from '../helper/push.js';

function parseHour(hour) {
  const hourStr = '0000' + hour.toString();
  return hourStr.substr(-4, 2) + ':' + hourStr.substr(-2, 2);
}

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
          weekDay: 'asc',
          hour: 'asc'
        })
        .populate('user', 'name gravatarHash username')
        .lean()
        .exec();

      const settings = await Settings.findOne();
      const increment = settings && settings.appointmentsIncrement
        ? settings.appointmentsIncrement
        : 0;

      result.map(entry => {
        // add global increment
        entry.hour = (entry.hour + 100 * increment);
        // handle overflow and negative overflow
        entry.hour = ((entry.hour % 2400) + 2400) % 2400;

        if (json.hours.indexOf(entry.hour) < 0) {
          json.hours.push(entry.hour);
        }
        json.appointments.push(entry);
      });

      res.json(json);
    } catch (err) {
      logger.error('Appointment Error', err);
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
        .lean();

      if (!result) return res.sendStatus(404);

      const settings = await Settings.findOne();

      if (settings && settings.appointmentsIncrement) {
        result.hour = (result.hour + 100 * settings.appointmentsIncrement);
        // handle overflow and negative overflow
        result.hour = ((result.hour % 2400) + 2400) % 2400;
      }

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
      await Appointment.create({
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
      // gets appointment
      let appointment = await Appointment
        .findById(req.params.id)
        .exec();

      if (!appointment) return res.sendStatus(404);

      // check if another user is registered
      if (appointment.user && appointment.user != req.user._doc._id) {
        return res.status(400).send('another user is registered');
      }

      if (!appointment.user) {
        // check if user is already in another appointment and remove it
        const otherAppointment = await Appointment
          .findOne({
            user: req.user._doc._id
          })
          .exec();

        if (otherAppointment) {
          otherAppointment.user = null;
          await otherAppointment.save();
        }
      }

      // toggle registration for current user
      appointment.user = appointment.user && appointment.user == req.user._doc._id
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
   * @api {delete} /api/appointment/remove/:id Deletes any user from appointment
   * @apiName DeleteRegistration
   * @apiGroup Appointment
   */
  router.delete('/api/appointment/remove/:id', admin, async (req, res) => {
    try {
      // gets appointment
      let appointment = await Appointment
        .findById(req.params.id)
        .exec();

      if (!appointment) return res.sendStatus(404);

      // Remove registration from appointment
      appointment.user = null;

      await appointment.save();
      // sending broadcast WebSocket for taken/fred appointment
      io.sockets.emit('appointment', appointment);

      res.sendStatus(200);
    } catch (err) {
      res.send(err);
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

  /**
   * @api {put} /api/appointment/updateHours Update all appointment hours
   * @apiName UpdateAppointment
   * @apiGroup Appointment
   */
  router.post('/api/appointment/updateHours', admin, async (req, res) => {
    try {
      if (typeof(req.body.increment) !== 'number') {
        return res.sendStatus(400);
      }

      let appointments = await Appointment
        .find()
        .exec();

      for (let app of appointments) {
        app.hour = (app.hour + 100 * req.body.increment);
        // handle overflow and negative overflow
        app.hour = ((app.hour % 2400) + 2400) % 2400;
        await app.save();
      }

      res.sendStatus(200);
    } catch (err) {
      res.status(500).send(err);
    }
  });
};
