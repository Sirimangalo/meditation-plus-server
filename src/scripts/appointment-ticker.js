import mongoose from 'mongoose';
import mongooseConf from '../config/mongoose.conf.js';
import {validateEnvVariables} from '../config/env.conf.js';
import {logger} from '../app/helper/logger.js';
import Appointment from '../app/models/appointment.model.js';
import Settings from '../app/models/settings.model.js';
import appointHelper from '../app/helper/appointment.js';
import webpush from 'web-push';

validateEnvVariables();
mongooseConf(mongoose);

const exit = () => mongoose.connection.close();
const sendTicker = async () => {
  const settings = await Settings.findOne();

  if (!settings || !settings.appointmentsTicker) {
    return exit();
  }

  const now = new Date();
  let nextAppointment = await Appointment
    .findOne({
      user: { $exists: true, $ne: null },
      weekDay: now.getDay(),
      hour: {
        $gte: now.getHours() * 100 + now.getMinutes(),
      }
    })
    .populate('user', 'name gravatarHash')
    .then();


  if (!nextAppointment) {
    return exit();
  }

  if (settings.appointmentsIncrement) {
    // add global increment
    nextAppointment =
      appointmentHelper.addIncrement(nextAppointment, settings.appointmentsIncrement);
  }

  const notification = {
    title: nextAppointment.user.name,
    body: `is scheduled for ${appointmentHelper.parseHour(nextAppointment.hour)}`,
    tag: 'appointment-ticker',
    silent: true,
    icon: nextAppointment.user.gravatarHash.length === 32
      ? `https://www.gravatar.com/avatar/${req.user._doc.gravatarHash}?s=192`
      : null,
    sticky: true // not supported by browsers (yet)
  };

  settings.appointmentsTicker.map(
    sub => webpush.send(JSON.parse(sub), JSON.stringify(notification))
  );

  exit();
};

sendTicker();
