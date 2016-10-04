import { ProfileHelper } from './profile.js';
import { expect } from 'chai';
import moment from 'moment';
import { _ } from 'lodash';

describe('ProfileHelper', () => {
  let profileHelper = new ProfileHelper();

  it('should set value', () => {
    const testVar = 1;
    const newVar = profileHelper.setValue(testVar, 2);
    expect(testVar).to.equal(1);
    expect(newVar).to.equal(2);
  });

  it('should add value', () => {
    const testVar = 1;
    const newVar = profileHelper.setValue(testVar, 2, true);
    expect(testVar).to.equal(1);
    expect(newVar).to.equal(3);
  });

  it('should set timespan value', () => {
    const meditations = {
      lastMonths: {},
      lastWeeks: {},
      lastDays: {},
      timespan: profileHelper.initializeTimespans({})
    };
    const date = moment();
    const result = profileHelper.setTimespanValue(meditations, date, 60);
    let check = {
      lastMonths: {},
      lastWeeks: {},
      lastDays: {}
    };
    check.lastMonths[date.format('MMM')] = 60;
    check.lastWeeks[date.format('w')] = 60;
    check.lastDays[date.format('Do')] = 60;

    expect(_.omit(result, 'timespan')).to.deep.equal(check);
  });

  it('should fill timespan', () => {
    const meditations = {
      lastMonths: {},
      lastWeeks: {},
      lastDays: {},
      timespan: profileHelper.initializeTimespans({})
    };

    const result = profileHelper.fillTimespan(meditations);
    expect(Object.keys(result.lastMonths).length).to.equal(10, 'expect 10 months');
    expect(Object.keys(result.lastWeeks).length).to.equal(10, 'expect 10 weeks');
    expect(Object.keys(result.lastDays).length).to.equal(10, 'expect 10 days');
  });
});
