import Appointment from '../models/appointment.model.js';
import { logger } from '../helper/logger.js';
import appointHelper from '../helper/appointment.js';

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

      result.map(entry => {
        if (json.hours.indexOf(entry.hour) < 0) {
          json.hours.push(entry.hour);
        }
        json.appointments.push(entry);
      });

      // sort hours ascending
      json.hours.sort((a, b) => (a - b));

      res.json(json);
    } catch (err) {
      logger.error('Appointment Error', err);
      res.status(400).send(err);
    }
  });

  /**
   * @api {get} /api/appointment/aggregated Get appointment days aggregated by their hour
   * @apiName AggregateAppointment
   * @apiGroup appointment
   */
  router.get('/api/appointment/aggregated', async (req, res) => {
    try {
      const data = await Appointment.aggregate([
        {
          $group: {
            _id: '$hour',
            days: { $push: '$weekDay'}
          }
        }
      ]);

      res.json(data);
    } catch (err) {
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
      let result = await Appointment
        .findOne({ _id: req.params.id })
        .lean();

      if (!result) return res.sendStatus(404);

      res.json(result);
    } catch (err) {
      res.send(err);
    }
  });

  /**
   * @api {post} /api/appointment/update Update the hour of all appointments with a specific hour
   * @apiName UpdateAppointments
   * @apiGroup Appointment
   *
   * @apiParam {number} oldHour   Hour/Time of appointments to be changed from
   * @apiParam {number} newHour   Hour/Time of appointments to be changed to
   */
  router.post('/api/appointment/update', admin, async (req, res) => {
    try {
      if (typeof req.body['oldHour'] !== 'number' || typeof req.body['newHour'] !== 'number') {
        return res.status(400).send('Invalid Parameters.');
      }

      const duplicates = await Appointment
        .find({
          hour: req.body['newHour']
        })
        .lean();

      if (duplicates.length > 0) {
        return res.status(400).send('Appointments with this hour already exist.');
      }

      const appointments = await Appointment
        .find({
          hour: req.body['oldHour']
        });

      if (appointments.length === 0) {
        return res.status(400).send('No appointments with this hour found.');
      }

      for (let appoint of appointments) {
        await appoint.update({
          hour: req.body['newHour']
        });
      }

      io.sockets.emit('appointment', true);

      res.sendStatus(204);
    } catch (err) {
      res.status(400).send(err);
    }
  });

  /**
   * @api {post} /api/appointment/toggle Toggle an appointment (create or delete it) based on hour and day
   * @apiName ToggleAppointment
   * @apiGroup Appointment
   *
   * @apiParam {number} hour   Hour of appointment
   * @apiParam {number} day    Weekday of appointment
   */
  router.post('/api/appointment/toggle', admin, async (req, res) => {
    try {
      if (typeof req.body['hour'] !== 'number' || typeof req.body['day'] !== 'number') {
        return res.status(400).send('Invalid Parameters.');
      }

      const appointments = await Appointment
        .find({
          hour: req.body['hour'],
          weekDay: req.body['day']
        })
        .exec();

      if (appointments.length > 0) {
        // toggle = delete
        for (const appoint of appointments) {
          await appoint.remove();
        }
      } else {
        // toggle = create
        await Appointment.create({
          hour: req.body['hour'],
          weekDay: req.body['day']
        });
      }

      io.sockets.emit('appointment', true);
      res.sendStatus(appointments.length > 0 ? 204 : 201);
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
      // check for duplicates
      const duplicates = await Appointment
        .find({
          weekDay: req.body.weekDay,
          hour: req.body.hour
        })
        .lean();

      if (duplicates.length > 0) {
        return res.status(400).send('This appointment already exists.');
      }

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
      if (appointment.user && appointment.user != req.user._id) {
        return res.status(400).send('another user is registered');
      }

      if (!appointment.user) {
        // check if user is already in another appointment and remove it
        const otherAppointment = await Appointment
          .findOne({
            user: req.user._id
          })
          .exec();

        if (otherAppointment) {
          otherAppointment.user = null;
          await otherAppointment.save();
        }
      }

      // toggle registration for current user
      appointment.user = appointment.user && appointment.user == req.user._id
        ? null
        : req.user;

      await appointment.save();
      // sending broadcast WebSocket for taken/fred appointment
      io.sockets.emit('appointment', appointment);

      // notify possible updates
      appointHelper.notify().then();

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

      // notify possible updates
      appointHelper.notify().then();

      res.sendStatus(200);
    } catch (err) {
      res.send(err);
    }
  });
};
