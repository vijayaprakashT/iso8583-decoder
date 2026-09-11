import type { TlvNode } from './types';

/**
 * DE55 carries chip data as BER-TLV: tag, length, value, repeated.
 * A tag whose first byte has bit 6 set is "constructed", meaning its value is
 * itself a run of TLV objects — so the parser recurses.
 */

export const EMV_TAGS: Record<string, string> = {
  '4F': 'Application Identifier (AID) — card',
  '50': 'Application Label',
  '57': 'Track 2 Equivalent Data',
  '5A': 'Application PAN',
  '5F20': 'Cardholder Name',
  '5F24': 'Application Expiration Date',
  '5F25': 'Application Effective Date',
  '5F28': 'Issuer Country Code',
  '5F2A': 'Transaction Currency Code',
  '5F2D': 'Language Preference',
  '5F30': 'Service Code',
  '5F34': 'Application PAN Sequence Number',
  '61': 'Application Template',
  '6F': 'File Control Information (FCI) Template',
  '70': 'Record Template',
  '71': 'Issuer Script Template 1',
  '72': 'Issuer Script Template 2',
  '77': 'Response Message Template Format 2',
  '80': 'Response Message Template Format 1',
  '82': 'Application Interchange Profile (AIP)',
  '84': 'Dedicated File (DF) Name',
  '86': 'Issuer Script Command',
  '87': 'Application Priority Indicator',
  '88': 'Short File Identifier',
  '8A': 'Authorisation Response Code (ARC)',
  '8C': 'Card Risk Management Data Object List 1 (CDOL1)',
  '8D': 'Card Risk Management Data Object List 2 (CDOL2)',
  '8E': 'Cardholder Verification Method (CVM) List',
  '8F': 'Certification Authority Public Key Index',
  '91': 'Issuer Authentication Data',
  '93': 'Signed Static Application Data',
  '94': 'Application File Locator (AFL)',
  '95': 'Terminal Verification Results (TVR)',
  '97': 'Transaction Certificate Data Object List (TDOL)',
  '9A': 'Transaction Date',
  '9B': 'Transaction Status Information (TSI)',
  '9C': 'Transaction Type',
  '9D': 'Directory Definition File Name',
  '9F01': 'Acquirer Identifier',
  '9F02': 'Amount, Authorised',
  '9F03': 'Amount, Other',
  '9F06': 'Application Identifier (AID) — terminal',
  '9F07': 'Application Usage Control',
  '9F08': 'Application Version Number — card',
  '9F09': 'Application Version Number — terminal',
  '9F0D': 'Issuer Action Code — Default',
  '9F0E': 'Issuer Action Code — Denial',
  '9F0F': 'Issuer Action Code — Online',
  '9F10': 'Issuer Application Data (IAD)',
  '9F11': 'Issuer Code Table Index',
  '9F12': 'Application Preferred Name',
  '9F13': 'Last Online ATC Register',
  '9F15': 'Merchant Category Code',
  '9F16': 'Merchant Identifier',
  '9F17': 'PIN Try Counter',
  '9F18': 'Issuer Script Identifier',
  '9F1A': 'Terminal Country Code',
  '9F1B': 'Terminal Floor Limit',
  '9F1C': 'Terminal Identification',
  '9F1E': 'Interface Device (IFD) Serial Number',
  '9F21': 'Transaction Time',
  '9F26': 'Application Cryptogram',
  '9F27': 'Cryptogram Information Data (CID)',
  '9F33': 'Terminal Capabilities',
  '9F34': 'CVM Results',
  '9F35': 'Terminal Type',
  '9F36': 'Application Transaction Counter (ATC)',
  '9F37': 'Unpredictable Number',
  '9F39': 'POS Entry Mode',
  '9F40': 'Additional Terminal Capabilities',
  '9F41': 'Transaction Sequence Counter',
  '9F42': 'Application Currency Code',
  '9F44': 'Application Currency Exponent',
  '9F45': 'Data Authentication Code',
  '9F46': 'ICC Public Key Certificate',
  '9F4C': 'ICC Dynamic Number',
  '9F4E': 'Merchant Name and Location',
  '9F53': 'Transaction Category Code',
  '9F5B': 'Issuer Script Results',
  '9F6E': 'Form Factor Indicator / Third Party Data',
  '9F7C': 'Merchant Custom Data',
  BF0C: 'FCI Issuer Discretionary Data',
};

const EMV_TRANSACTION_TYPES: Record<string, string> = {
  '00': 'Purchase (goods and services)',
  '01': 'Cash advance',
  '09': 'Purchase with cashback',
  '20': 'Refund',
  '30': 'Balance inquiry',
};

/** 9F27 — the top two bits say which cryptogram the card returned. */
function describeCid(hex: string): string {
  const byte = parseInt(hex.slice(0, 2), 16);
  if (Number.isNaN(byte)) return 'Unreadable';
  const type = (byte & 0b1100_0000) >> 6;
  const label =
    type === 0b00
      ? 'AAC — declined offline'
      : type === 0b01
        ? 'TC — approved offline'
        : type === 0b10
          ? 'ARQC — going online for authorization'
          : 'AAR — authorization request referral';
  const advice = (byte & 0b0000_1000) !== 0 ? ', advice required' : '';
  return `${label}${advice}`;
}

/** 82 — Application Interchange Profile, 2 bytes of card capability flags. */
function describeAip(hex: string): string {
  const b1 = parseInt(hex.slice(0, 2), 16);
  if (Number.isNaN(b1)) return 'Unreadable';
  const flags: string[] = [];
  if (b1 & 0b0100_0000) flags.push('SDA supported');
  if (b1 & 0b0010_0000) flags.push('DDA supported');
  if (b1 & 0b0001_0000) flags.push('Cardholder verification supported');
  if (b1 & 0b0000_1000) flags.push('Terminal risk management to be performed');
  if (b1 & 0b0000_0100) flags.push('Issuer authentication supported');
  if (b1 & 0b0000_0001) flags.push('CDA supported');
  return flags.length ? flags.join(', ') : 'No capabilities flagged';
}

/** 95 — Terminal Verification Results, 5 bytes of "what went wrong" flags. */
const TVR_BITS: Array<Array<string | null>> = [
  // byte 1, bit 8 → bit 1
  [
    'Offline data authentication was not performed',
    'SDA failed',
    'ICC data missing',
    'Card appears on terminal exception file',
    'DDA failed',
    'CDA failed',
    null,
    null,
  ],
  [
    'ICC and terminal have different application versions',
    'Expired application',
    'Application not yet effective',
    'Requested service not allowed for card product',
    'New card',
    null,
    null,
    null,
  ],
  [
    'Cardholder verification was not successful',
    'Unrecognised CVM',
    'PIN try limit exceeded',
    'PIN entry required and PIN pad not present or not working',
    'PIN entry required, PIN pad present, but PIN was not entered',
    'Online PIN entered',
    null,
    null,
  ],
  [
    'Transaction exceeds floor limit',
    'Lower consecutive offline limit exceeded',
    'Upper consecutive offline limit exceeded',
    'Transaction selected randomly for online processing',
    'Merchant forced transaction online',
    null,
    null,
    null,
  ],
  [
    'Default TDOL used',
    'Issuer authentication failed',
    'Script processing failed before final GENERATE AC',
    'Script processing failed after final GENERATE AC',
    null,
    null,
    null,
    null,
  ],
];

function describeTvr(hex: string): string {
  if (hex.length < 10) return 'Expected 5 bytes';
  const set: string[] = [];
  for (let b = 0; b < 5; b++) {
    const byte = parseInt(hex.slice(b * 2, b * 2 + 2), 16);
    if (Number.isNaN(byte)) continue;
    for (let bit = 0; bit < 8; bit++) {
      const mask = 0b1000_0000 >> bit;
      if (byte & mask) {
        const label = TVR_BITS[b][bit];
        set.push(label ?? `byte ${b + 1} bit ${8 - bit} (RFU)`);
      }
    }
  }
  return set.length ? set.join('; ') : 'All checks passed — no exceptions raised';
}

/** 9B — Transaction Status Information, 2 bytes. */
function describeTsi(hex: string): string {
  const b1 = parseInt(hex.slice(0, 2), 16);
  if (Number.isNaN(b1)) return 'Unreadable';
  const flags: string[] = [];
  if (b1 & 0b1000_0000) flags.push('Offline data authentication performed');
  if (b1 & 0b0100_0000) flags.push('Cardholder verification performed');
  if (b1 & 0b0010_0000) flags.push('Card risk management performed');
  if (b1 & 0b0001_0000) flags.push('Issuer authentication performed');
  if (b1 & 0b0000_1000) flags.push('Terminal risk management performed');
  if (b1 & 0b0000_0100) flags.push('Script processing performed');
  return flags.length ? flags.join(', ') : 'No steps flagged as performed';
}

function interpretTag(tag: string, value: string): string | undefined {
  switch (tag) {
    case '9F27':
      return describeCid(value);
    case '82':
      return describeAip(value);
    case '95':
      return describeTvr(value);
    case '9B':
      return describeTsi(value);
    case '9C':
      return EMV_TRANSACTION_TYPES[value] ?? `Unknown transaction type (${value})`;
    case '9A':
      return value.length === 6 ? `20${value.slice(0, 2)}-${value.slice(2, 4)}-${value.slice(4, 6)}` : undefined;
    case '9F21':
      return value.length === 6 ? `${value.slice(0, 2)}:${value.slice(2, 4)}:${value.slice(4, 6)}` : undefined;
    case '9F02':
    case '9F03': {
      const n = value.replace(/^0+(?=\d)/, '');
      if (!/^\d+$/.test(value)) return undefined;
      const padded = n.padStart(3, '0');
      return `${padded.slice(0, -2)}.${padded.slice(-2)} (minor units assumed 2)`;
    }
    case '9F36':
      return `Transaction #${parseInt(value, 16)} on this card`;
    case '9F26':
      return 'Cryptogram generated by the card — the issuer verifies this';
    case '9F10':
      return 'Issuer-proprietary; layout differs per application (CVN)';
    case '5F2A':
    case '9F1A':
      return value === '0000' ? undefined : `Code ${value}`;
    default:
      return undefined;
  }
}

export interface TlvParseResult {
  nodes: TlvNode[];
  error?: string;
}

/**
 * Parse a run of hex characters as BER-TLV.
 * Tolerant by design: a malformed tail returns what was parsed plus an error,
 * because a partially readable trace is still useful during an incident.
 */
export function parseTlv(hex: string, depth = 0): TlvParseResult {
  const clean = hex.replace(/\s+/g, '').toUpperCase();
  const nodes: TlvNode[] = [];
  let i = 0;

  if (clean.length % 2 !== 0) {
    return { nodes, error: 'TLV data has an odd number of hex characters.' };
  }

  while (i < clean.length) {
    // Skip 00 / FF padding between objects.
    const lead = clean.slice(i, i + 2);
    if (lead === '00' || lead === 'FF') {
      i += 2;
      continue;
    }

    // --- Tag ---
    const firstByte = parseInt(lead, 16);
    if (Number.isNaN(firstByte)) {
      return { nodes, error: `Invalid hex at position ${i}.` };
    }
    let tag = lead;
    i += 2;
    if ((firstByte & 0x1f) === 0x1f) {
      // Multi-byte tag: keep consuming while the high bit is set.
      for (;;) {
        const nextByteHex = clean.slice(i, i + 2);
        if (nextByteHex.length < 2) return { nodes, error: 'Message ended inside a TLV tag.' };
        tag += nextByteHex;
        i += 2;
        if ((parseInt(nextByteHex, 16) & 0x80) === 0) break;
      }
    }
    const constructed = (firstByte & 0x20) !== 0;

    // --- Length ---
    const lenByteHex = clean.slice(i, i + 2);
    if (lenByteHex.length < 2) return { nodes, error: `Tag ${tag} has no length byte.` };
    let lenByte = parseInt(lenByteHex, 16);
    i += 2;
    let length: number;
    if (lenByte <= 0x7f) {
      length = lenByte;
    } else {
      const count = lenByte & 0x7f;
      if (count === 0 || count > 3) {
        return { nodes, error: `Tag ${tag} has an unsupported long-form length (0x${lenByteHex}).` };
      }
      const lenHex = clean.slice(i, i + count * 2);
      if (lenHex.length < count * 2) return { nodes, error: `Tag ${tag} has a truncated length.` };
      length = parseInt(lenHex, 16);
      i += count * 2;
    }

    // --- Value ---
    const value = clean.slice(i, i + length * 2);
    if (value.length < length * 2) {
      return {
        nodes,
        error: `Tag ${tag} declares ${length} bytes but only ${value.length / 2} remain.`,
      };
    }
    i += length * 2;

    const node: TlvNode = {
      tag,
      name: EMV_TAGS[tag] ?? 'Unknown or proprietary tag',
      length,
      value,
      constructed,
      interpretation: constructed ? undefined : interpretTag(tag, value),
    };

    if (constructed && depth < 4 && length > 0) {
      const inner = parseTlv(value, depth + 1);
      if (inner.nodes.length) node.children = inner.nodes;
    }

    nodes.push(node);
  }

  return { nodes };
}

/** Flatten a TLV tree for searching or table display. */
export function flattenTlv(nodes: TlvNode[], depth = 0): Array<TlvNode & { depth: number }> {
  const out: Array<TlvNode & { depth: number }> = [];
  for (const n of nodes) {
    out.push({ ...n, depth });
    if (n.children) out.push(...flattenTlv(n.children, depth + 1));
  }
  return out;
}
