import { TimeAgoPipe } from './time-ago.pipe';

describe('TimeAgoPipe', () => {
  let pipe: TimeAgoPipe;
  let originalDateNow: () => number;
  const referenceDate = new Date('2025-01-01T00:00:00Z').getTime(); // January 1, 2025

  beforeEach(() => {
    pipe = new TimeAgoPipe();
    originalDateNow = Date.now;

    // Mock Date.now to return our reference date
    spyOn(Date, 'now').and.returnValue(referenceDate);
  });

  afterEach(() => {
    // Restore original Date.now
    // @ts-ignore
    Date.now = originalDateNow;
  });
  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should return "in the future" for future dates', () => {
    const futureDate = referenceDate + 60000; // 1 minute in the future
    expect(pipe.transform(futureDate)).toBe('in the future');
  });

  it('should return "just now" for timestamps less than 30 seconds ago', () => {
    const justNowDate = referenceDate - 15000; // 15 seconds ago
    expect(pipe.transform(justNowDate)).toBe('just now');
  });

  it('should return "last year" for exactly 1 year ago', () => {
    // Exactly 1 year ago (approximation)
    const oneYearAgo = referenceDate - 365 * 24 * 60 * 60 * 1000;
    expect(pipe.transform(oneYearAgo)).toBe('last year');
  });

  it('should return "last month" for exactly 1 month ago', () => {
    // Approximately 1 month ago
    const oneMonthAgo = referenceDate - 30 * 24 * 60 * 60 * 1000;
    expect(pipe.transform(oneMonthAgo)).toBe('last month');
  });

  it('should return "last week" for exactly 1 week ago', () => {
    // Exactly 1 week ago
    const oneWeekAgo = referenceDate - 7 * 24 * 60 * 60 * 1000;
    expect(pipe.transform(oneWeekAgo)).toBe('last week');
  });

  it('should return "yesterday" for exactly 1 day ago', () => {
    // Exactly 1 day ago
    const oneDayAgo = referenceDate - 24 * 60 * 60 * 1000;
    expect(pipe.transform(oneDayAgo)).toBe('yesterday');
  });

  it('should return plural form for multiple units ago', () => {
    // 2 years ago
    const twoYearsAgo = referenceDate - 2 * 365 * 24 * 60 * 60 * 1000;
    expect(pipe.transform(twoYearsAgo)).toBe('2 years ago');

    // 3 months ago
    const threeMonthsAgo = referenceDate - 3 * 30 * 24 * 60 * 60 * 1000;
    expect(pipe.transform(threeMonthsAgo)).toBe('3 months ago');

    // 4 weeks ago
    const fourWeeksAgo = referenceDate - 4 * 7 * 24 * 60 * 60 * 1000;
    expect(pipe.transform(fourWeeksAgo)).toBe('4 weeks ago');

    // 5 days ago
    const fiveDaysAgo = referenceDate - 5 * 24 * 60 * 60 * 1000;
    expect(pipe.transform(fiveDaysAgo)).toBe('5 days ago');

    // 6 hours ago
    const sixHoursAgo = referenceDate - 6 * 60 * 60 * 1000;
    expect(pipe.transform(sixHoursAgo)).toBe('6 hours ago');

    // 7 minutes ago
    const sevenMinutesAgo = referenceDate - 7 * 60 * 1000;
    expect(pipe.transform(sevenMinutesAgo)).toBe('7 minutes ago');

    // 45 seconds ago
    const fortyFiveSecondsAgo = referenceDate - 45 * 1000;
    expect(pipe.transform(fortyFiveSecondsAgo)).toBe('45 seconds ago');
  });

  it('should return singular form for exactly 1 unit ago (except special cases)', () => {
    // 1 hour ago
    const oneHourAgo = referenceDate - 1 * 60 * 60 * 1000;
    expect(pipe.transform(oneHourAgo)).toBe('1 hour ago');

    // 1 minute ago
    const oneMinuteAgo = referenceDate - 1 * 60 * 1000;
    expect(pipe.transform(oneMinuteAgo)).toBe('1 minute ago');
  });
});
