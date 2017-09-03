import mongoose from 'mongoose';
import mongooseConf from '../config/mongoose.conf.js';
import {validateEnvVariables} from '../config/env.conf.js';
import {logger} from '../app/helper/logger.js';
import appointHelper from '../app/helper/appointment.js';

validateEnvVariables();
mongooseConf(mongoose);

const doIt = async () => await appointHelper.notify();
doIt();

logger.info('Sending notifications about next appointment');
sendTicker();
