import mongoose from 'mongoose';
import mongooseConf from '../config/mongoose.conf.js';
import {validateEnvVariables} from '../config/env.conf.js';
import Broadcast from '../app/models/broadcast.model.js';
import {logger} from '../app/helper/logger.js';
import push from '../app/helper/push.js';

validateEnvVariables();
mongooseConf(mongoose);


logger.info('Adding new database entry for Broadcast');

Broadcast
  .create({
    started: new Date()
  })
  .then(() => mongoose.connection.close());


logger.info('Sending out PUSH notifications');

push.send({
  'notifications.livestream': true
}, {
  title: 'Livestream starting now',
  data: {
    url: '/live'
  }
});
