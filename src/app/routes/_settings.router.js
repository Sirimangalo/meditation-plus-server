import settingsHelper from '../helper/settings.js';

export default (app, router, admin) => {
  /**
   * @api {post} /api/settings/appointments Update appointment's increment (of hours) parameter
   * @apiName UpdateAppointmentIncrement
   * @apiGroup Settings
   */
  router.post('/api/settings/appointments', admin, async (req, res) => {
    try {
      const increment = req.body.increment ? req.body.increment : 0;
      await settingsHelper.set('appointmentIncrement', increment);

      res.sendStatus(200);
    } catch (err) {
      res.status(500).send(err);
    }
  });

  /**
   * @api {get} /api/settings/appointments Get appointment's increment (of hours) parameter
   * @apiName GetAppointmentIncrement
   * @apiGroup Settings
   *
   * @apiSuccess {Number}   increment           value of hours to add
   */
  router.get('/api/settings/appointments', async (req, res) => {
    try {
      const increment = await settingsHelper.get('appointmentIncrement');

      res.json(increment ? increment : 0);
    } catch (err) {
      res.status(500).send(err);
    }
  });
};
