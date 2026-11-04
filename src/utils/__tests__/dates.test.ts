import {
  addMonths,
  dayInMonth,
  daysBetween,
  isDay,
  monthShort,
  monthsBetween,
  ofMonth,
  parseDayInput,
  parseMonthInput,
  dayLongLabel,
  dayToInput,
  monthToInput,
  todayOf,
} from '../dates';

describe('dates', () => {
  it('adds months across years in both directions', () => {
    expect(addMonths('2026-11', 3)).toBe('2027-02');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(addMonths('2026-01', -25)).toBe('2023-12');
    expect(monthsBetween('2025-11', '2027-02')).toBe(15);
  });

  it('maps day 31 to the last day of short months, leap years included', () => {
    expect(dayInMonth('2026-02', 31)).toBe('2026-02-28');
    expect(dayInMonth('2028-02', 31)).toBe('2028-02-29');
    expect(dayInMonth('2026-04', 31)).toBe('2026-04-30');
    expect(isDay('2026-02-29')).toBe(false);
    expect(isDay('2028-02-29')).toBe(true);
  });

  it('counts days ignoring daylight saving time', () => {
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2);
    expect(daysBetween('2026-01-01', '2027-01-01')).toBe(365);
  });

  it('formats today as a local ISO day', () => {
    expect(todayOf(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });

  it('uses unambiguous French month abbreviations', () => {
    expect(['2026-06', '2026-07', '2026-08', '2026-09', '2026-05'].map(monthShort)).toEqual([
      'juin',
      'juil.',
      'août',
      'sep.',
      'mai',
    ]);
    expect(ofMonth('2026-10')).toBe("d'octobre");
    expect(ofMonth('2026-05')).toBe('de mai');
  });

  it('parses French date inputs and rejects impossible dates', () => {
    expect(parseDayInput('2/3/2026')).toBe('2026-03-02');
    expect(parseDayInput('29/02/2026')).toBeNull();
    expect(parseDayInput('hier')).toBeNull();
    expect(parseMonthInput('1/2027')).toBe('2027-01');
    expect(parseMonthInput('13/2027')).toBeNull();
    expect(dayToInput('2026-10-22')).toBe('22/10/2026');
    expect(monthToInput('2026-10')).toBe('10/2026');
    expect(dayToInput(null)).toBe('');
    expect(dayLongLabel('2026-08-01')).toBe('1er août 2026');
    expect(dayLongLabel('2026-10-22')).toBe('22 octobre 2026');
  });
});
