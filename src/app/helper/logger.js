import winston from 'winston';

let logger = new winston.Logger({
  transports: [
    new (winston.transports.Console)({
      level: 'debug',
      handleExceptions: true,
      json: false,
      colorize: true,
      timestamp: true
    })
  ]
});
logger.cli();

export { logger };
