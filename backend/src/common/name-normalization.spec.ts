import { normalizeName } from './name-normalization';

describe('normalizeName', () => {
  it('trims outer spaces and lowercases (RF-001a)', () => {
    expect(normalizeName(' YUCA ')).toBe('yuca');
  });

  it('treats mixed case variants as the same name', () => {
    expect(normalizeName('Yuca')).toBe(normalizeName('yuca'));
    expect(normalizeName('  Yuca')).toBe(normalizeName('YUCA  '));
  });

  it('keeps distinct names different', () => {
    expect(normalizeName('Yuca')).not.toBe(normalizeName('Yuca amarilla'));
  });

  it('preserves inner content', () => {
    expect(normalizeName('Queso amarillo')).toBe('queso amarillo');
  });
});
