const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const thousands = (value: number): string =>
  value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

const decimals = (value: number): string =>
  (Math.round(value * 100) / 100).toFixed(2).replace('.', ',');

export const formatBs = (value: number): string =>
  `Bs ${thousands(Math.round(Number(value)))}`;

export const formatUsd = (value: number): string => `$ ${decimals(value)}`;

export const formatRate = (value: number): string => decimals(value);

export const formatShortDate = (isoDate: string): string => {
  const [year, month, day] = isoDate.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
};

export const monthLabel = (date: Date): string =>
  `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
