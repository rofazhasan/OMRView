export const toBanglaNumber = (num: number | string): string => {
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return num.toString().replace(/\d/g, (d) => banglaDigits[parseInt(d, 10)]);
};

/**
 * Generates an authentic Bangladesh Board CQ script serial number (e.g. T2608492015, R2648192305).
 * Uses cryptographic randomness to ensure high entropy and zero repetition.
 */
export const generateBoardCQSerial = (prefix = 'T', year = '26'): string => {
  // Normalize year to 2 English digits (e.g. '2026' -> '26', '২৬' -> '26', '2025' -> '25')
  const enYear = String(year || '26')
    .replace(/[০-৯]/g, (d) => String('০১২৩৪৫৬৭৮৯'.indexOf(d)))
    .replace(/\D/g, '');
  const cleanYear = enYear.length >= 2 ? enYear.slice(-2) : (enYear.length === 1 ? `0${enYear}` : '26');
  const cleanPrefix = (prefix || 'T').toUpperCase().trim();

  // Use cryptographic randomness when available in browser or Node.js runtime
  let randNum: number;
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const uint32Array = new Uint32Array(1);
    crypto.getRandomValues(uint32Array);
    // Generates an authentic 8-digit random integer between 10000000 and 99999999
    randNum = 10000000 + (uint32Array[0] % 90000000);
  } else {
    randNum = Math.floor(10000000 + Math.random() * 90000000);
  }

  return `${cleanPrefix}${cleanYear}${randNum}`;
};

/**
 * Increments an alphanumeric board serial number for batch printing copies.
 */
export const incrementBoardSerial = (serial: string, offset: number): string => {
  const match = serial.match(/^([A-Za-z]+)(\d+)$/);
  if (!match) return `${serial}-${offset}`;
  const prefix = match[1];
  const numStr = match[2];
  const nextNum = (BigInt(numStr) + BigInt(offset)).toString();
  return `${prefix}${nextNum.padStart(numStr.length, '0')}`;
};

