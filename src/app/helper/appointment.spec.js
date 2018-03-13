// eslint-disable-next-line no-unused-vars
import { app } from '../../server.conf.js';
import { expect } from 'chai';
import { AuthedSupertest } from '../helper/authed-supertest.js';
import appointHelper from './appointment.js';
import timekeeper from 'timekeeper';
import moment from 'moment-timezone';
import Settings from '../models/settings.model.js';
import Appointment from '../models/appointment.model.js';
import User from '../models/appointment.model.js';

let alice = new AuthedSupertest();
let mallory = new AuthedSupertest(
  'Mallory',
  'mallory',
  'mallory@sirimangalo.org'
);

describe('Appointment Helper', () => {
  describe('Utilities', () => {
    it('should format hour correctly', () => {
      expect(appointHelper.printHour(6)).to.equal('00:06');
      expect(appointHelper.printHour(59)).to.equal('00:59');
      expect(appointHelper.printHour(159)).to.equal('01:59');
      expect(appointHelper.printHour(1759)).to.equal('17:59');
      expect(appointHelper.printHour(2359)).to.equal('23:59');
    });
  });

  describe('Current Appointment', () => {
    // eslint-disable-next-line no-unused-vars
    let settings, appointmentUser, appointmentNoUser;

    alice.authorize();
    mallory.authorize();

    before(async () => {
      await Appointment.remove();
      await Settings.remove();

      await Settings.create({
        appointmentsTimezone: 'America/Toronto'
      });

      appointmentUser = await Appointment.create({
        user: alice.user._id,
        weekDay: 3,
        hour: 1400
      });

      appointmentNoUser = await Appointment.create({
        weekDay: 0,
        hour: 1100
      });
    });

    after(async () => {
      await User.remove();
      await Appointment.remove();
      await Settings.remove();
    });

    it('should return null for invalid user at invalid time', async () => {
      timekeeper.travel(moment.tz('2018-10-10 10:00:00', 'America/Toronto').toDate());
      expect(await appointHelper.getNow(mallory.user, 5, 5)).to.equal(null);

      timekeeper.travel(moment.tz('2153-01-20 19:00:00', 'America/Toronto').toDate());
      expect(await appointHelper.getNow(mallory.user, 5, 5)).to.equal(null);

      timekeeper.travel(moment.tz('2018-10-14 10:45:00', 'America/Toronto').toDate());
      expect(await appointHelper.getNow(mallory.user, 5, 5)).to.equal(null);
    });

    it('should return null for invalid user at valid time', async () => {
      timekeeper.travel(moment.tz('2018-10-10 14:00:00', 'America/Toronto').toDate());
      expect(await appointHelper.getNow(mallory.user, 5, 5)).to.equal(null);

      timekeeper.travel(moment.tz('2018-10-14 10:58:00', 'America/Toronto').toDate());
      expect(await appointHelper.getNow(mallory.user, 5, 5)).to.equal(null);
    });

    it('should return null for valid user at invalid time', async () => {
      timekeeper.travel(moment.tz('2018-10-10 10:00:00', 'America/Toronto').toDate());
      expect(await appointHelper.getNow(alice.user, 5, 5)).to.equal(null);

      timekeeper.travel(moment.tz('2153-01-20 19:00:00', 'America/Toronto').toDate());
      expect(await appointHelper.getNow(alice.user, 5, 5)).to.equal(null);

      timekeeper.travel(moment.tz('2018-10-14 10:45:00', 'America/Toronto').toDate());
      expect(await appointHelper.getNow(alice.user, 5, 5)).to.equal(null);
    });

    it('should return appointment for valid user at valid time', async () => {
      timekeeper.travel(moment.tz('2018-10-10 14:00:00', 'America/Toronto').toDate());
      const temp = await appointHelper.getNow(alice.user, 5, 5);
      expect(temp).to.not.equal(null);
      expect(temp._id.toString()).to.equal(appointmentUser._id.toString());

      timekeeper.travel(moment.tz('2018-10-17 14:00:00', 'America/Toronto').toDate());
      expect(await appointHelper.getNow(alice.user, 5, 5)).to.not.equal(null);

      timekeeper.travel(moment.tz('2018-10-14 11:00:00', 'America/Toronto').toDate());
      expect(await appointHelper.getNow(alice.user, 5, 5)).to.equal(null);
    });

    it('should return appointment within tolerance time', async () => {
      timekeeper.travel(moment.tz('2018-10-10 13:55:00', 'America/Toronto').toDate());
      expect(await appointHelper.getNow(alice.user, 5, 5)).to.not.equal(null);

      timekeeper.travel(moment.tz('2018-10-10 13:53:00', 'America/Toronto').toDate());
      expect(await appointHelper.getNow(alice.user, 5, 5)).to.equal(null);

      timekeeper.travel(moment.tz('2018-10-10 13:53:00', 'America/Toronto').toDate());
      expect(await appointHelper.getNow(alice.user, 10, 5)).to.not.equal(null);

      timekeeper.travel(moment.tz('2018-10-10 14:07:00', 'America/Toronto').toDate());
      expect(await appointHelper.getNow(alice.user, 10, 5)).to.equal(null);

      timekeeper.travel(moment.tz('2018-10-10 14:07:00', 'America/Toronto').toDate());
      expect(await appointHelper.getNow(alice.user, 10, 10)).to.not.equal(null);
    });
  });
});
