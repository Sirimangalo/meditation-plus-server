import Settings from '../models/settings.model.js';

export default (app, router, admin) => {
  /**
   * @api {get} /api/settings Get the settings entity
   * @apiName GetSettings
   * @apiGroup Settings
   */
  router.get('/api/settings', admin, async (req, res) => {
    try {
      const settings = await Settings.findOne();

      if (!settings) {
        return res.sendStatus(400);
      }

      res.json(settings);
    } catch (err) {
      res.status(500).send(err);
    }
  });

  /**
   * @api {put} /api/settings Get the settings entity
   * @apiName SetSettingsProperty
   * @apiGroup Settings
   */
  router.put('/api/settings/:property', admin, async (req, res) => {
    try {
      if (!req.params.property || typeof(req.body.value) === 'undefined') {
        return res.sendStatus(400);
      }

      let settings = await Settings.findOne();

      if (!settings) {
        return res.sendStatus(404);
      }

      settings[req.params.property] = req.body.value;
      await settings.save();

      res.sendStatus(200);
    } catch (err) {
      res.status(500).send(err);
    }
  });

  /**
   * @api {delete} /api/settings Get the settings entity
   * @apiName DeleteSettingsProperty
   * @apiGroup Settings
   */
  router.delete('/api/settings/:property', admin, async (req, res) => {
    try {
      const settings = await Settings.findOne();

      if (!settings || !req.params.property) {
        return res.sendStatus(400);
      }

      delete settings[req.params.property];
      await settings.save();

      res.sendStatus(200);
    } catch (err) {
      res.status(500).send(err);
    }
  });
};
