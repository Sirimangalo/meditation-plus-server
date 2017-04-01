import config from './config.json';
import { logger } from '../app/helper/logger.js';

// Check each necessary node `environment variable` to see if a
// value has been set and if not, use the `config` object to
// supply appropriate values
export function validateEnvVariables() {

  // If no value has been assigned to our environment variables,
  // set them up...

  if(!process.env.NODE_ENV) {
    process.env.NODE_ENV = config.ENV;
  }

  // Check to see if `process.env.NODE_ENV` is valid
  validateNodeEnvironment();

  // For Express/Passport
  if (!process.env.SESSION_SECRET)
    process.env.SESSION_SECRET = config.SESSION_SECRET;

  if (!process.env.PORT)
    process.env.PORT = config.PORT;

  if (!process.env.YOUTUBE_API_KEY)
    process.env.YOUTUBE_API_KEY = config.YOUTUBE_API_KEY;

  // Set the appropriate MongoDB URI
  validateMongoUri();

  return;
}

function validateNodeEnvironment() {
  // Check to see that the `process.env.NODE_ENV has been
  // set to an appropriate value of `development`, `production`
  // or `test`. If not, alert the user and default to `development`

  switch(process.env.NODE_ENV) {

  case 'development':

    logger.info(`Node environment set for ${process.env.NODE_ENV}`);
    break;

  case 'production':

    logger.info(`Node environment set for ${process.env.NODE_ENV}`);
    break;

  case 'test':

    logger.info(`Node environment set for ${process.env.NODE_ENV}`);
    break;

  default:

    logger.error('process.env.NODE_ENV should be set to a valid '
      + ' value such as \'production\', \'development\', or \'test\'.');
    logger.info('Value received: ' + process.env.NODE_ENV);
    logger.info('Defaulting value for: development');
    process.env.NODE_ENV = 'development';
    break;
  }

  return;
}

// Set the appropriate MongoDB URI with the `config` object
// based on the value in `process.env.NODE_ENV
function validateMongoUri() {

  if (!process.env.MONGO_URI) {

    logger.info('No value set for MONGO_URI...');
    logger.info('Using the supplied value from config object...');

    switch(process.env.NODE_ENV) {

    case 'development':

      process.env.MONGO_URI = config.MONGO_URI.DEVELOPMENT;
      logger.info(`MONGO_URI set for ${process.env.NODE_ENV}`);
      break;

    case 'production':

      process.env.MONGO_URI = config.MONGO_URI.PRODUCTION;
      logger.info(`MONGO_URI set for ${process.env.NODE_ENV}`);
      break;

    case 'test':

      process.env.MONGO_URI = config.MONGO_URI.TEST;
      logger.info(`MONGO_URI set for ${process.env.NODE_ENV}`);
      break;

    default:

      logger.error('Unexpected behavior! process.env.NODE_ENV set to ' +
        'unexpected value!');
      break;
    }
  }

  return;
}
