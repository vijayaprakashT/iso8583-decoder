import { buildMessage } from './builder';

/**
 * Sample messages, entirely synthetic.
 *
 * The card numbers are ISO/IEC 7812 test PANs, the merchant details are made
 * up, and the cryptograms are random bytes. Nothing here comes from a real
 * transaction, a real merchant, or any processor's production traffic.
 *
 * Samples are stored as field maps and packed on demand by the builder, so a
 * sample can never drift out of sync with the parser.
 */

export interface Sample {
  id: string;
  title: string;
  blurb: string;
  mti: string;
  fields: Record<number, string>;
}

const EMV_REQUEST_TLV = [
  '9F2608A1B2C3D4E5F60718', // Application Cryptogram (ARQC)
  '9F270180', // CID — ARQC, go online
  '9F100706010A03A00000', // Issuer Application Data
  '9F37046D8F2A11', // Unpredictable Number
  '9F36020142', // ATC — 322nd transaction on this card
  '95050000008000', // TVR — transaction exceeds floor limit
  '9A03260912', // Transaction date 2026-09-12
  '9C0100', // Transaction type — purchase
  '9F0206000000012550', // Amount authorised 125.50
  '9F0306000000000000', // Amount other
  '5F2A020978', // Transaction currency — EUR
  '82023900', // AIP — DDA, CV, terminal risk mgmt, CDA
  '9F1A020752', // Terminal country — Sweden
  '9F3303E0F8C8', // Terminal capabilities
  '9F34031E0300', // CVM results
  '9F350122', // Terminal type — attended, merchant owned
  '9F1E083132333435363738', // IFD serial number
  '8407A0000000031010', // DF name — Visa credit/debit AID
  '9B02E800', // TSI
].join('');

const EMV_RESPONSE_TLV = [
  '8A023030', // ARC "00"
  '910A1122334455667788AABB', // Issuer Authentication Data (ARPC + CSU)
  '9F36020143', // ATC echoed
].join('');

export const SAMPLES: Sample[] = [
  {
    id: 'auth-request-chip',
    title: '0100 — Chip authorization request',
    blurb:
      'Contact chip purchase of EUR 125.50 at a Swedish attended terminal. Carries the full DE55 chip payload, so the EMV tree is populated.',
    mti: '0100',
    fields: {
      2: '4111111111111111',
      3: '000000',
      4: '000000012550',
      7: '0912104512',
      11: '004521',
      12: '124512',
      13: '0912',
      14: '2809',
      18: '5812',
      22: '051',
      25: '00',
      32: '00000012345',
      35: '4111111111111111=28091010000012300000',
      37: '625510045210',
      41: 'TERM0042',
      42: 'SWEMERCH0001234',
      43: 'HARBOUR COFFEE HOUSE   STOCKHOLM     SE',
      49: '978',
      55: EMV_REQUEST_TLV,
    },
  },
  {
    id: 'auth-response-approved',
    title: '0110 — Authorization response, approved',
    blurb:
      'The issuer answers the message above. DE39 is 00, DE38 carries the approval code, and DE55 comes back with issuer authentication data.',
    mti: '0110',
    fields: {
      2: '4111111111111111',
      3: '000000',
      4: '000000012550',
      7: '0912104513',
      11: '004521',
      12: '124513',
      13: '0912',
      32: '00000012345',
      37: '625510045210',
      38: 'A73B9K',
      39: '00',
      41: 'TERM0042',
      49: '978',
      55: EMV_RESPONSE_TLV,
    },
  },
  {
    id: 'auth-response-declined',
    title: '0110 — Authorization response, declined',
    blurb:
      'Same transaction, DE39 51 — insufficient funds. Useful for showing that a decline is a perfectly successful message, just an unhappy outcome.',
    mti: '0110',
    fields: {
      2: '4111111111111111',
      3: '000000',
      4: '000000012550',
      7: '0912104513',
      11: '004521',
      12: '124513',
      13: '0912',
      32: '00000012345',
      37: '625510045210',
      39: '51',
      41: 'TERM0042',
      49: '978',
    },
  },
  {
    id: 'financial-request-magstripe',
    title: '0200 — Financial request, magstripe fallback',
    blurb:
      'INR 2,499.00 read by magstripe fallback after a chip failure (DE22 800). Authorization and clearing in one message.',
    mti: '0200',
    fields: {
      2: '5500005555555559',
      3: '000000',
      4: '000000249900',
      7: '0912061503',
      11: '008812',
      12: '114503',
      13: '0912',
      14: '2711',
      18: '5411',
      22: '800',
      25: '00',
      32: '00000067890',
      35: '5500005555555559=27111010000098700000',
      37: '625508881200',
      41: 'CHNTRM09',
      42: 'INDMERCH0006789',
      43: 'MARINA GROCERS         CHENNAI       IN',
      49: '356',
    },
  },
  {
    id: 'reversal-request',
    title: '0400 — Reversal request',
    blurb:
      'The terminal never saw the response, so the acquirer reverses. DE90 identifies the original transaction — the field that makes reversals reconcilable.',
    mti: '0400',
    fields: {
      2: '4111111111111111',
      3: '000000',
      4: '000000012550',
      7: '0912105002',
      11: '004599',
      12: '125002',
      13: '0912',
      32: '00000012345',
      37: '625510045990',
      39: '00',
      41: 'TERM0042',
      42: 'SWEMERCH0001234',
      49: '978',
      90: '010000452109121045120000001234500000000000',
    },
  },
  {
    id: 'network-echo',
    title: '0800 — Network management echo test',
    blurb:
      'The heartbeat between an acquirer and a switch. DE70 301 is an echo test; 001 and 002 are sign-on and sign-off.',
    mti: '0800',
    fields: {
      7: '0912090000',
      11: '000001',
      70: '301',
    },
  },
];

/** Pack a sample into the wire string the decoder expects. */
export function renderSample(sample: Sample): string {
  const result = buildMessage(sample.mti, sample.fields);
  return result.message;
}

export function getSample(id: string): Sample | undefined {
  return SAMPLES.find((s) => s.id === id);
}
