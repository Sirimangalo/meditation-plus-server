import appointHelper from './appointment.js';
import { expect } from 'chai';

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
});
