import mongoose from 'mongoose';
import mongooseConf from '../config/mongoose.conf.js';
import {validateEnvVariables} from '../config/env.conf.js';
import Broadcast from '../app/models/broadcast.model.js';

validateEnvVariables();
mongooseConf(mongoose);

console.log('Adding new database entry for Broadcast');


Broadcast
  .create({
    started: new Date()
  })
  .then(() => mongoose.connection.close());
