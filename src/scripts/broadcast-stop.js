import mongoose from 'mongoose';
import mongooseConf from '../config/mongoose.conf.js';
import {validateEnvVariables} from '../config/env.conf.js';
import Broadcast from '../app/models/broadcast.model.js';
import youtubeHelper from '../app/helper/youtube.js';

validateEnvVariables();
mongooseConf(mongoose);


/**
 * Repetetly checks for a broadcast record on youtube being published.
 * Adds link to broadcast if it finds the processed video.
 *
 * @param  {Broadcast} broadcast  Model of broadcast without link
 */
const checkBroadcastLink = async (broadcast, currentTry = 1) => {
  if (!broadcast || !broadcast.ended) {
    mongoose.connection.close();
    return;
  }
  // Check every 30 minutes, max. 5 times
  const interval = 1800000;
  const maxTries = 5;
  const findBroadcast = await youtubeHelper.findBroadcastURL(broadcast);

  console.log('Trying to catch video URL (' + currentTry + '/' + maxTries + ')');

  if (findBroadcast.items && findBroadcast.items.length !== 0) {
    broadcast.videoUrl = 'https://youtu.be/' + findBroadcast.items[0].id.videoId;
    await broadcast.save();
    mongoose.connection.close();
  } else if (currentTry < maxTries){
    setTimeout(() => {
      checkBroadcastLink(broadcast, currentTry + 1);
    }, interval);
  } else {
    mongoose.connection.close();
  }
};

const updateBroadcast = async () => {
  const broadcast = await Broadcast
    .findOne({
      $or: [{
        ended: { $exists: false }
      }, {
        ended: null
      }],
      // Assume broadcast started no longer than 3 hours ago
      started: { $gt: new Date().setHours(new Date().getHours() - 3) }
    });

  if (broadcast) {
    console.log('Updating broadcast end date/time');
    broadcast.ended = new Date();
    await broadcast.save();
  }

  checkBroadcastLink(broadcast);
};

updateBroadcast();
