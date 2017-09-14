import mongoose from 'mongoose';
import mongooseConf from '../config/mongoose.conf.js';
import {validateEnvVariables} from '../config/env.conf.js';
import {logger} from '../app/helper/logger.js';
// eslint-disable-next-line no-unused-vars
import PushSubscriptions from '../app/models/push.model.js';
import appointHelper from '../app/helper/appointment.js';

validateEnvVariables();
mongooseConf(mongoose);

logger.info('Sending notifications about next appointment');

appointHelper
  .notify()
  .then((res) => {
    logger.info(res);
    mongoose.connection.close();
  });

