/**
 * Lookup tables that turn coded field values into plain language.
 * These are the fields you actually squint at during an incident.
 */

/** DE39 — response code. */
export const RESPONSE_CODES: Record<string, string> = {
  '00': 'Approved',
  '01': 'Refer to card issuer',
  '02': 'Refer to card issuer, special condition',
  '03': 'Invalid merchant',
  '04': 'Pick up card',
  '05': 'Do not honour',
  '06': 'Error',
  '07': 'Pick up card, special condition',
  '08': 'Honour with identification',
  '09': 'Request in progress',
  '10': 'Approved, partial amount',
  '11': 'Approved, VIP',
  '12': 'Invalid transaction',
  '13': 'Invalid amount',
  '14': 'Invalid card number',
  '15': 'No such issuer',
  '19': 'Re-enter transaction',
  '21': 'No action taken',
  '25': 'Unable to locate record',
  '28': 'File temporarily unavailable',
  '30': 'Format error',
  '39': 'No credit account',
  '41': 'Lost card',
  '43': 'Stolen card',
  '51': 'Insufficient funds',
  '52': 'No cheque account',
  '53': 'No savings account',
  '54': 'Expired card',
  '55': 'Incorrect PIN',
  '56': 'No card record',
  '57': 'Transaction not permitted to cardholder',
  '58': 'Transaction not permitted to terminal',
  '59': 'Suspected fraud',
  '61': 'Exceeds withdrawal amount limit',
  '62': 'Restricted card',
  '63': 'Security violation',
  '65': 'Exceeds withdrawal frequency limit',
  '68': 'Response received too late',
  '75': 'PIN tries exceeded',
  '76': 'Invalid "to" account',
  '77': 'Invalid "from" account',
  '78': 'Invalid or non-existent account',
  '82': 'Negative CAM, dCVV, iCVV or CVV results',
  '85': 'No reason to decline',
  '91': 'Issuer or switch inoperative',
  '92': 'Financial institution not found',
  '93': 'Transaction cannot be completed, violation of law',
  '94': 'Duplicate transmission',
  '96': 'System malfunction',
  N7: 'Decline for CVV2 failure',
};

/** DE3 positions 1–2 — transaction type. */
export const TRANSACTION_TYPES: Record<string, string> = {
  '00': 'Purchase (goods and services)',
  '01': 'Cash withdrawal',
  '09': 'Purchase with cashback',
  '17': 'Cash disbursement',
  '20': 'Refund / return',
  '21': 'Deposit',
  '28': 'Payment',
  '30': 'Balance inquiry',
  '31': 'Available funds inquiry',
  '40': 'Account transfer',
  '50': 'Payment from account',
  '92': 'PIN change',
};

/** DE3 positions 3–4 and 5–6 — account types. */
export const ACCOUNT_TYPES: Record<string, string> = {
  '00': 'Default / unspecified',
  '10': 'Savings',
  '20': 'Checking',
  '30': 'Credit',
  '40': 'Universal',
  '50': 'Investment',
  '60': 'Electronic purse',
  '96': 'Cash card',
};

/** DE22 positions 1–2 — how the PAN was captured. */
export const PAN_ENTRY_MODES: Record<string, string> = {
  '00': 'Unknown',
  '01': 'Manual key entry',
  '02': 'Magnetic stripe',
  '03': 'Bar code',
  '04': 'OCR',
  '05': 'Chip (ICC), CVV can be checked',
  '07': 'Contactless chip (EMV)',
  '10': 'Credential on file',
  '79': 'Chip read, fallback attempted',
  '80': 'Magnetic stripe fallback after chip failure',
  '81': 'E-commerce / card not present',
  '90': 'Full magnetic stripe read',
  '91': 'Contactless magnetic stripe',
  '95': 'Chip (ICC), CVV may not be checked',
};

/** DE22 position 3 — PIN entry capability of the terminal. */
export const PIN_ENTRY_CAPABILITY: Record<string, string> = {
  '0': 'Unknown',
  '1': 'Terminal can accept PIN',
  '2': 'Terminal cannot accept PIN',
  '8': 'PIN pad inoperative',
};

/** DE25 — POS condition code. */
export const POS_CONDITION_CODES: Record<string, string> = {
  '00': 'Normal presentment — cardholder present, card present',
  '01': 'Customer not present',
  '02': 'Unattended terminal, card can be retained',
  '03': 'Merchant suspicious',
  '04': 'Customer present, card not present',
  '05': 'Preauthorized request',
  '06': 'Preauthorized request, part of a series',
  '08': 'Mail or telephone order',
  '51': 'Account-to-account transfer',
  '59': 'E-commerce transaction',
};

/** DE70 — network management information code. */
export const NETWORK_CODES: Record<string, string> = {
  '001': 'Sign-on',
  '002': 'Sign-off',
  '003': 'Change key',
  '101': 'File action request',
  '161': 'Key change',
  '201': 'Cut-over',
  '301': 'Echo test',
};

/** A small ISO 4217 subset — enough to make DE49 readable in demos. */
export const CURRENCIES: Record<string, string> = {
  '036': 'AUD — Australian dollar',
  '124': 'CAD — Canadian dollar',
  '156': 'CNY — Chinese yuan',
  '208': 'DKK — Danish krone',
  '344': 'HKD — Hong Kong dollar',
  '356': 'INR — Indian rupee',
  '392': 'JPY — Japanese yen',
  '404': 'KES — Kenyan shilling',
  '554': 'NZD — New Zealand dollar',
  '578': 'NOK — Norwegian krone',
  '682': 'SAR — Saudi riyal',
  '702': 'SGD — Singapore dollar',
  '710': 'ZAR — South African rand',
  '752': 'SEK — Swedish krona',
  '756': 'CHF — Swiss franc',
  '784': 'AED — UAE dirham',
  '826': 'GBP — Pound sterling',
  '840': 'USD — US dollar',
  '978': 'EUR — Euro',
  '986': 'BRL — Brazilian real',
};

/** Currencies whose minor unit is not 2 decimal places. */
const MINOR_UNITS: Record<string, number> = {
  '392': 0, // JPY
  '410': 0, // KRW
  '952': 0, // XOF
  '048': 3, // BHD
  '400': 3, // JOD
  '414': 3, // KWD
  '512': 3, // OMR
  '788': 3, // TND
};

export function minorUnits(currencyCode?: string): number {
  if (!currencyCode) return 2;
  return MINOR_UNITS[currencyCode] ?? 2;
}

/** Render a 12-digit ISO amount as a decimal string, e.g. "000000012550" → "125.50". */
export function formatAmount(raw: string, currencyCode?: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return raw;
  const decimals = minorUnits(currencyCode);
  const value = digits.replace(/^0+(?=\d)/, '');
  if (decimals === 0) return value;
  const padded = value.padStart(decimals + 1, '0');
  const whole = padded.slice(0, padded.length - decimals);
  const frac = padded.slice(padded.length - decimals);
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${grouped}.${frac}`;
}

export function describeProcessingCode(raw: string): string {
  if (raw.length !== 6) return 'Expected 6 digits';
  const type = TRANSACTION_TYPES[raw.slice(0, 2)] ?? `Unknown type (${raw.slice(0, 2)})`;
  const from = ACCOUNT_TYPES[raw.slice(2, 4)] ?? `Unknown (${raw.slice(2, 4)})`;
  const to = ACCOUNT_TYPES[raw.slice(4, 6)] ?? `Unknown (${raw.slice(4, 6)})`;
  return `${type} · from ${from} · to ${to}`;
}

export function describePosEntryMode(raw: string): string {
  if (raw.length !== 3) return 'Expected 3 digits';
  const pan = PAN_ENTRY_MODES[raw.slice(0, 2)] ?? `Unknown entry mode (${raw.slice(0, 2)})`;
  const pin = PIN_ENTRY_CAPABILITY[raw.slice(2, 3)] ?? `Unknown PIN capability (${raw.slice(2, 3)})`;
  return `${pan} · ${pin}`;
}

/** DE7 is MMDDhhmmss; DE12 hhmmss; DE13 MMDD. */
export function describeDateTime(raw: string): string {
  if (raw.length === 10) {
    return `${raw.slice(0, 2)}-${raw.slice(2, 4)} ${raw.slice(4, 6)}:${raw.slice(6, 8)}:${raw.slice(8, 10)} UTC (MMDD hh:mm:ss)`;
  }
  if (raw.length === 6) return `${raw.slice(0, 2)}:${raw.slice(2, 4)}:${raw.slice(4, 6)} local`;
  if (raw.length === 4) return `${raw.slice(0, 2)}-${raw.slice(2, 4)} (MMDD)`;
  return raw;
}

/** DE90 packs the identity of the transaction being reversed into 42 digits. */
export function describeOriginalDataElements(raw: string): string {
  if (raw.length !== 42) return 'Expected 42 digits';
  return [
    `original MTI ${raw.slice(0, 4)}`,
    `STAN ${raw.slice(4, 10)}`,
    `transmitted ${raw.slice(10, 12)}-${raw.slice(12, 14)} ${raw.slice(14, 16)}:${raw.slice(16, 18)}:${raw.slice(18, 20)}`,
    `acquirer ${raw.slice(20, 31).replace(/^0+(?=\d)/, '')}`,
  ].join(' · ');
}
