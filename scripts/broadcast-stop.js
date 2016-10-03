import mongoose from 'mongoose';
import mongooseConf from '../src/config/mongoose.conf.js';
import {validateEnvVariables} from '../src/config/env.conf.js';
import Broadcast from '../src/app/models/broadcast.model.js';

validateEnvVariables();
mongooseConf(mongoose);

console.log('Adding end of Broadcast to database entry');


Broadcast
  .find({
    $or: [{
      ended: { $exists: false }
    }, {
      ended: null
    }]
  })
  .sort({
    started: -1
  })
  .limit(1)
  .update({
    ended: new Date()
  })
  .then(() => {
    mongoose.connection.close()
  });
