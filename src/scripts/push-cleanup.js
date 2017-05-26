import mongoose from 'mongoose';
import mongooseConf from '../config/mongoose.conf.js';
import {validateEnvVariables} from '../config/env.conf.js';
import PushSubscriptions from '../app/models/push.model.js';
import {logger} from '../app/helper/logger.js';

validateEnvVariables();
mongooseConf(mongoose);


logger.info('Cleaning up old Push-Subscriptions');

// Cleanup old (7 days) subscriptions
PushSubscriptions
  .find({
    updatedAt: { $lt: Date.now() - 6048e5 }
  })
  .remove()
  .exec()
  .then(() => mongoose.connection.close());
