// eslint-disable-next-line no-unused-vars
import { app } from '../../server.conf.js';
import Appointment from '../models/appointment.model.js';
import Settings from '../models/settings.model.js';
import appointHelper from './appointment.js';
import { expect } from 'chai';
import moment from 'moment-timezone';

describe('Appointment Helper', () => {

  it('should format hour correctly', () => {
    expect(appointHelper.printHour(6)).to.equal('00:06');
    expect(appointHelper.printHour(59)).to.equal('00:59');
    expect(appointHelper.printHour(159)).to.equal('01:59');
    expect(appointHelper.printHour(1759)).to.equal('17:59');
    expect(appointHelper.printHour(2359)).to.equal('23:59');
  });

  it('should apply increment to appointment correctly', () => {
    const dummy1 = { hour: 6, weekDay: 3 };
    const dummy2 = { hour: 2314, weekDay: 6 };
    const dummy3 = { hour: 1300, weekDay: 0 };

    expect(appointHelper.addIncrement(dummy1, 1).hour).to.equal(106);
    expect(appointHelper.addIncrement(dummy1, 8).hour).to.equal(906);
    expect(appointHelper.addIncrement(dummy1, 0).weekDay).to.equal(3);
    expect(appointHelper.addIncrement(dummy1, -10).hour).to.equal(2306);
    expect(appointHelper.addIncrement(dummy1, 0).weekDay).to.equal(2);
    expect(appointHelper.addIncrement(dummy1, 24).hour).to.equal(2306);
    expect(appointHelper.addIncrement(dummy1, 24).hour).to.equal(2306);
    expect(appointHelper.addIncrement(dummy1, 0).weekDay).to.equal(4);

    expect(appointHelper.addIncrement(dummy2, 1).hour).to.equal(14);
    expect(appointHelper.addIncrement(dummy2, 8).hour).to.equal(814);
    expect(appointHelper.addIncrement(dummy2, 0).weekDay).to.equal(0);
    expect(appointHelper.addIncrement(dummy2, -10).hour).to.equal(2214);
    expect(appointHelper.addIncrement(dummy2, 0).weekDay).to.equal(6);

    expect(appointHelper.addIncrement(dummy3, 11).hour).to.equal(0);
    expect(appointHelper.addIncrement(dummy3, 0).weekDay).to.equal(1);
    expect(appointHelper.addIncrement(dummy3, -24).hour).to.equal(0);
    expect(appointHelper.addIncrement(dummy3, 0).weekDay).to.equal(0);
    expect(appointHelper.addIncrement(dummy3, -1).weekDay).to.equal(6);
  });

  describe('Find appointment at certain time', () => {
    before(done => {
      Appointment.remove(() => Appointment
        .insertMany([
          { weekDay: 0, hour: 0 },
          { weekDay: 1, hour: 10 },
          { weekDay: 2, hour: 700 },
          { weekDay: 3, hour: 1400 },
          { weekDay: 4, hour: 1800 },
          { weekDay: 5, hour: 1730 },
          { weekDay: 6, hour: 2300 }
        ])
        .then((docs, err) => {
          if (err) return done(err);
          done();
        })
      );
    });

    describe('Without increment', () => {
      before(done => {
        Settings.remove(() => {
          Settings
            .create({
              appointmentsIncrement: 0,
              appointmentsTimezone: 'America/Toronto'
            })
            .then((docs, err) => {
              if (err) return done(err);
              done();
            });
        });
      });

      it('should find appointments correctly', async () => {
        const dt = moment();

        const app1 = await appointHelper.getAt(dt.weekday(0).hours(0).minutes(0));

        expect(app1).to.not.be.null;
        expect(app1.weekDay).to.equal(0);
        expect(app1.hour).to.equal(0);

        const app2 = await appointHelper.getAt(dt.weekday(4).hours(18).minutes(0));
        expect(app2).to.not.be.null;
        expect(app2.weekDay).to.equal(4);
        expect(app2.hour).to.equal(1800);

        const app3 = await appointHelper.getAt(dt.weekday(5).hours(17).minutes(30));
        expect(app3).to.not.be.null;
        expect(app3.weekDay).to.equal(5);
        expect(app3.hour).to.equal(1730);
      });

      it('should find within range correctly', async () => {
        const dt = moment();

        let app1 = await appointHelper.getAt(dt.weekday(0).hours(0).minutes(10).seconds(0), 0, 10);

        expect(app1).to.not.be.null;
        expect(app1.weekDay).to.equal(0);
        expect(app1.hour).to.equal(0);

        app1 = await appointHelper.getAt(dt.weekday(0).hours(0).minutes(10), 0, 15);
        expect(app1).to.not.be.null;
        expect(app1.weekDay).to.equal(0);
        expect(app1.hour).to.equal(0);

        app1 = await appointHelper.getAt(dt.weekday(0).hours(0).minutes(10), 0, 9);
        expect(app1).to.be.null;

        app1 = await appointHelper.getAt(dt.weekday(6).hours(23).minutes(55), 5, 0);
        expect(app1).to.not.be.null;
        expect(app1.weekDay).to.equal(0);
        expect(app1.hour).to.equal(0);

        app1 = await appointHelper.getAt(dt.weekday(6).hours(23).minutes(52), 15, 0);
        expect(app1).to.not.be.null;
        expect(app1.weekDay).to.equal(0);
        expect(app1.hour).to.equal(0);

        app1 = await appointHelper.getAt(dt.weekday(6).hours(23).minutes(52), 3, 0);
        expect(app1).to.be.null;

        let app2 = await appointHelper.getAt(dt.weekday(5).hours(18).minutes(25), 0, 65);
        expect(app2).to.not.be.null;
        expect(app2.weekDay).to.equal(5);
        expect(app2.hour).to.equal(1730);

        app2 = await appointHelper.getAt(dt.weekday(5).hours(18).minutes(0), 0, 30);
        expect(app2).to.not.be.null;
        expect(app2.weekDay).to.equal(5);
        expect(app2.hour).to.equal(1730);

        let app3 = await appointHelper.getAt(dt.weekday(4).hours(0).minutes(0), 18 * 60, 0);
        expect(app3).to.not.be.null;
        expect(app3.weekDay).to.equal(4);
        expect(app3.hour).to.equal(1800);

        app3 = await appointHelper.getAt(dt.weekday(5).hours(0).minutes(5), 0, 6 * 60 + 6);
        expect(app3).to.not.be.null;
        expect(app3.weekDay).to.equal(4);
        expect(app3.hour).to.equal(1800);
      });
    });

    describe('With increment', () => {
      before(done => {
        Settings.remove(() => {
          Settings
            .create({
              appointmentsIncrement: 2,
              appointmentsTimezone: 'America/Toronto'
            })
            .then((docs, err) => {
              if (err) return done(err);
              done();
            });
        });
      });

      it('should find appointments correctly', async () => {
        const dt = moment();

        const app1 = await appointHelper.getAt(dt.weekday(0).hours(2).minutes(0));

        expect(app1).to.not.be.null;
        expect(app1.weekDay).to.equal(0);
        expect(app1.hour).to.equal(200);

        const app2 = await appointHelper.getAt(dt.weekday(4).hours(20).minutes(0));
        expect(app2).to.not.be.null;
        expect(app2.weekDay).to.equal(4);
        expect(app2.hour).to.equal(2000);

        const app3 = await appointHelper.getAt(dt.weekday(5).hours(19).minutes(30));
        expect(app3).to.not.be.null;
        expect(app3.weekDay).to.equal(5);
        expect(app3.hour).to.equal(1930);
      });

      it('should find within range correctly', async () => {
        const dt = moment();

        let app1 = await appointHelper.getAt(dt.weekday(0).hours(2).minutes(10).seconds(0), 0, 10);

        expect(app1).to.not.be.null;
        expect(app1.weekDay).to.equal(0);
        expect(app1.hour).to.equal(200);

        app1 = await appointHelper.getAt(dt.weekday(0).hours(2).minutes(10), 0, 15);
        expect(app1).to.not.be.null;
        expect(app1.weekDay).to.equal(0);
        expect(app1.hour).to.equal(200);

        app1 = await appointHelper.getAt(dt.weekday(0).hours(2).minutes(10), 0, 9);
        expect(app1).to.be.null;

        app1 = await appointHelper.getAt(dt.weekday(0).hours(1).minutes(55), 5, 0);
        expect(app1).to.not.be.null;
        expect(app1.weekDay).to.equal(0);
        expect(app1.hour).to.equal(200);

        app1 = await appointHelper.getAt(dt.weekday(0).hours(1).minutes(52), 15, 0);
        expect(app1).to.not.be.null;
        expect(app1.weekDay).to.equal(0);
        expect(app1.hour).to.equal(200);

        app1 = await appointHelper.getAt(dt.weekday(6).hours(23).minutes(52), 3, 0);
        expect(app1).to.be.null;

        let app2 = await appointHelper.getAt(dt.weekday(5).hours(20).minutes(25), 0, 65);
        expect(app2).to.not.be.null;
        expect(app2.weekDay).to.equal(5);
        expect(app2.hour).to.equal(1930);

        app2 = await appointHelper.getAt(dt.weekday(5).hours(20).minutes(0), 0, 30);
        expect(app2).to.not.be.null;
        expect(app2.weekDay).to.equal(5);
        expect(app2.hour).to.equal(1930);

        let app3 = await appointHelper.getAt(dt.weekday(4).hours(2).minutes(0), 18 * 60, 0);
        expect(app3).to.not.be.null;
        expect(app3.weekDay).to.equal(4);
        expect(app3.hour).to.equal(2000);

        app3 = await appointHelper.getAt(dt.weekday(5).hours(2).minutes(5), 0, 6 * 60 + 6);
        expect(app3).to.not.be.null;
        expect(app3.weekDay).to.equal(4);
        expect(app3.hour).to.equal(2000);

        let app4 = await appointHelper.getAt(dt.weekday(1).hours(23).minutes(55), 9 * 60 + 5, 0);
        expect(app4).to.not.be.null;
        expect(app4.weekDay).to.equal(2);
        expect(app4.hour).to.equal(900);

        app4 = await appointHelper.getAt(dt.weekday(1).hours(23).minutes(55), 9 * 60 + 4, 0);
        expect(app4).to.be.null;
      });
    });
  });

});
