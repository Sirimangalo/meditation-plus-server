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
});
