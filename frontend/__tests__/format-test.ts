import {
  formatBs,
  formatRate,
  formatShortDate,
  formatUsd,
  monthLabel,
} from '@/lib/format';

describe('money and date formatting', () => {
  it('formats bolivares with dot thousands separators', () => {
    expect(formatBs(480000)).toBe('Bs 480.000');
    expect(formatBs(1250000)).toBe('Bs 1.250.000');
    expect(formatBs(0)).toBe('Bs 0');
    expect(formatBs(480500.6)).toBe('Bs 480.501');
  });

  it('formats dollars with two decimals and comma', () => {
    expect(formatUsd(200)).toBe('$ 200,00');
    expect(formatUsd(20.08)).toBe('$ 20,08');
    expect(formatUsd(0)).toBe('$ 0,00');
  });

  it('formats exchange rates with two decimals and comma', () => {
    expect(formatRate(36.5)).toBe('36,50');
    expect(formatRate(37.1)).toBe('37,10');
    expect(formatRate(40)).toBe('40,00');
  });

  it('formats short dates without timezone shifts', () => {
    expect(formatShortDate('2026-10-01T00:00:00.000Z')).toBe('01/10/2026');
    expect(formatShortDate('2026-01-15')).toBe('15/01/2026');
  });

  it('labels the current month in spanish', () => {
    expect(monthLabel(new Date(2026, 9, 15))).toBe('Octubre 2026');
    expect(monthLabel(new Date(2026, 0, 2))).toBe('Enero 2026');
  });
});
