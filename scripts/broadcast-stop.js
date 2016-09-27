import mongoose from 'mongoose';
import mongooseConf from '../src/config/mongoose.conf.js';
import {validateEnvVariables} from '../src/config/env.conf.js';
import Broadcast from '../src/app/models/broadcast.model.js';

validateEnvVariables();
mongooseConf(mongoose);

let lastBroadcast = Broadcast
  .find()
  .sort({
    started: 1
  })
  .limit(1);

console.log(lastBroadcast);
lastBroadcast.ended = new Date(),


mongoose.connection.close()