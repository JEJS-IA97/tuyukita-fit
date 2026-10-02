import {
  fromMinor,
  round2,
  sumMinor,
  toMinor,
  usdToVes,
  vesToUsd,
} from './money';

describe('round2', () => {
  it('rounds to two decimals', () => {
    expect(round2(1.005)).toBe(1.01);
    expect(round2(2.344)).toBe(2.34);
    expect(round2(2.345)).toBe(2.35);
    expect(round2(10)).toBe(10);
  });
});

describe('minor unit conversion (scaled integers)', () => {
  it('converts amounts to minor units and back (RF-006, RF-007)', () => {
    expect(toMinor(1234.56)).toBe(123456);
    expect(fromMinor(123456)).toBe(1234.56);
    expect(toMinor(0.1)).toBe(10);
  });

  it('rounds half up when scaling', () => {
    expect(toMinor(1.005)).toBe(101);
  });

  it('is stable across a round trip', () => {
    for (const amount of [0.99, 12.3, 100, 27397.26]) {
      expect(fromMinor(toMinor(amount))).toBe(amount);
    }
  });

  it('avoids floating point artifacts', () => {
    expect(toMinor(0.1 + 0.2)).toBe(30);
  });
});

describe('currency conversion (RF-018)', () => {
  const rate = 36.5;

  it('converts VES to USD with two decimal rounding', () => {
    expect(vesToUsd(1000000, rate)).toBe(27397.26);
  });

  it('converts USD back to VES with two decimal rounding', () => {
    expect(usdToVes(27397.26, rate)).toBe(999999.99);
  });

  it('rejects non-positive rates', () => {
    expect(() => vesToUsd(1000, 0)).toThrow();
    expect(() => vesToUsd(1000, -5)).toThrow();
    expect(() => usdToVes(10, 0)).toThrow();
  });
});

describe('sumMinor (RF-013)', () => {
  it('sums historical USD costs without precision loss', () => {
    expect(sumMinor([11250, 5000, 333])).toBe(16583);
    expect(sumMinor([10, 0])).toBe(10);
    expect(sumMinor([])).toBe(0);
  });
});
