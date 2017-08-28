import Settings from '../models/settings.model.js';

export default (app, router, admin) => {
  /**
   * @api {get} /api/settings Get the settings entity
   * @apiName GetSettings
   * @apiGroup Settings
   */
  router.get('/api/settings', admin, async (req, res) => {
    try {
      let settings = await Settings.findOneAndUpdate({}, {}, {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true
      });

      if (!settings) {
        settings = new Settings();
      }

      res.json(settings);
    } catch (err) {
      res.status(500).send(err);
    }
  });

  /**
   * @api {put} /api/settings Change the settings entity
   * @apiName SetProperty
   * @apiGroup Settings
   */
  router.put('/api/settings/:property', admin, async (req, res) => {
    try {
      if (!req.params.property || typeof(req.body.value) === 'undefined') {
        return res.sendStatus(400);
      }

      const settings = {};
      settings[req.params.property] = req.body.value;

      // update or create settings
      await Settings.findOneAndUpdate({}, settings, {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true
      });

      res.sendStatus(200);
    } catch (err) {
      res.status(500).send(err);
    }
  });
};
