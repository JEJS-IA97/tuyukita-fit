function scaleToTwoDecimals(value: number): number {
  const scaled = Number(`${value}e2`);
  return Number.isFinite(scaled)
    ? Math.round(scaled)
    : Math.round(value * 100);
}

export function round2(value: number): number {
  return scaleToTwoDecimals(value) / 100;
}

export function toMinor(amount: number): number {
  return scaleToTwoDecimals(amount);
}

export function fromMinor(minor: number): number {
  return minor / 100;
}

export function vesToUsd(
  vesAmount: number,
  rateVesPerUsd: number,
): number {
  if (!(rateVesPerUsd > 0)) {
    throw new Error('Exchange rate must be a positive number');
  }
  return round2(vesAmount / rateVesPerUsd);
}

export function usdToVes(
  usdAmount: number,
  rateVesPerUsd: number,
): number {
  if (!(rateVesPerUsd > 0)) {
    throw new Error('Exchange rate must be a positive number');
  }
  return round2(usdAmount * rateVesPerUsd);
}

export function sumMinor(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
