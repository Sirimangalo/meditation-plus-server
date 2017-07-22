import mongoose from 'mongoose';
import mongooseConf from '../config/mongoose.conf.js';
import {validateEnvVariables} from '../config/env.conf.js';
import Appointment from '../app/models/appointment.model.js';
import Settings from '../app/models/settings.model.js';
import User from '../app/models/user.model.js';
import PushSubscriptions from '../app/models/push.model.js';
import appointHelper from '../app/helper/appointment.js';
import webpush from 'web-push';
import moment from 'moment-timezone';

validateEnvVariables();
mongooseConf(mongoose);

const sendTicker = async () => {
  const settings = await Settings.findOne();

  if (!settings || !settings.appointmentsTicker) {
    // ... no admin has subscribed
    mongoose.connection.close();
    return;
  }

  // Search next appointment for today
  const now = moment.tz('America/Toronto');
  let nextAppointment = await Appointment
    .findOne({
      user: { $exists: true, $ne: null },
      weekDay: now.weekday(),
      hour: {
        $gte: now.hours() * 100 + now.minutes(),
      }
    })
    .populate('user', 'name gravatarHash')
    .then();


  if (!nextAppointment) {
    // ... there is no next appointment
    mongoose.connection.close();
    return;
  }

  if (settings.appointmentsIncrement) {
    // add global increment
    nextAppointment = appointHelper.addIncrement(nextAppointment, settings.appointmentsIncrement);
  }

  // Find push subscriptions related to endpoints from settings
  const subs = await PushSubscriptions
    .find({
      endpoint: { $in: settings.appointmentsTicker }
    })
    .then();

  if (!subs || !subs.length) {
    // ... the push subscription for the endpoints are deprecated
    // or don't exist
    mongoose.connection.close();
    return;
  }

  // notification object for push message
  const notification = {
    title: 'Next Appointment',
    body: `${nextAppointment.user.name} is scheduled for ${appointHelper.printHour(nextAppointment.hour)}`,
    tag: 'appointment-ticker',
    icon: nextAppointment.user.gravatarHash.length === 32
      ? `https://www.gravatar.com/avatar/${nextAppointment.user.gravatarHash}?s=192`
      : null,
    silent: true,
    sticky: true // not supported by browsers (yet)
  };

  subs.map(
    // send notification
    sub => webpush.sendNotification(JSON.parse(sub.subscription), JSON.stringify(notification))
  );

  mongoose.connection.close();
};

sendTicker();
