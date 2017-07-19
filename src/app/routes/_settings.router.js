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
        return res.sendStatus(404);
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

      const settings = {};
      settings[req.params.property] = req.body.value;

      await Settings.findOneAndUpdate({}, settings, {
        upsert: true
      });

      res.sendStatus(200);
    } catch (err) {
      res.status(500).send(err);
    }
  });
};
