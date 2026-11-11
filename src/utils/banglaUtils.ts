export const toBanglaNumber = (num: number | string): string => {
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return num.toString().replace(/\d/g, (d) => banglaDigits[parseInt(d, 10)]);
};

/**
 * Generates an authentic Bangladesh Board CQ script serial number (e.g. T2608492015).
 */
export const generateBoardCQSerial = (prefix = 'T', year = '26'): string => {
  const randNum = Math.floor(10000000 + Math.random() * 90000000);
  return `${prefix}${year}${randNum}`;
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

