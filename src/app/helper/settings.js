import Settings from '../models/settings.model.js';

export default {
  get: async (property) => {
    let settings = await Settings.findOne();
    return settings && settings[property] ? settings[property] : null;
  },
  set: async (property, value) => {
    let settings = await Settings.findOne();

    if (!settings) {
      let data = {};
      data[property] = value;

      settings = await Settings.create(data);
    } else {
      settings[property] = value;
      await settings.save();
    }
  }
};
