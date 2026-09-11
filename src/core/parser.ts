import { readBitmap } from './bitmap';
import {
  CURRENCIES,
  NETWORK_CODES,
  POS_CONDITION_CODES,
  RESPONSE_CODES,
  describeDateTime,
  describeOriginalDataElements,
  describePosEntryMode,
  describeProcessingCode,
  formatAmount,
} from './codes';
import { parseTlv } from './emv';
import { getSpec, prefixLength } from './fields';
import { maskField } from './mask';
import { decodeMti, isValidMti } from './mti';
import type { ParseOptions, ParseResult, ParseWarning, ParsedField } from './types';

/**
 * Accept what people actually paste: a plain ASCII message, the same message
 * with spaces or newlines in it, or a hex dump of an ASCII message.
 */
export function normalizeInput(input: string, stripSpaces = false): { text: string; note?: string } {
  // Line breaks and tabs are always cosmetic. Spaces are not: ans fields such
  // as DE43 (card acceptor name and location) are space-padded, so stripping
  // them by default would silently shorten real messages.
  const noBreaks = input.replace(/[\r\n\t]+/g, '');
  if (!noBreaks.trim()) return { text: '' };

  const noSpaces = noBreaks.replace(/ +/g, '');
  const looksHex = /^[0-9A-Fa-f]+$/.test(noSpaces) && noSpaces.length % 2 === 0 && noSpaces.length >= 8;
  if (looksHex) {
    // A hex dump of an ASCII message decodes to printable characters; a
    // genuinely ASCII message that happens to be all hex characters does not
    // need decoding. Decode only when the result is clearly printable text
    // that starts with a plausible MTI.
    let decoded = '';
    for (let i = 0; i < noSpaces.length; i += 2) {
      decoded += String.fromCharCode(parseInt(noSpaces.slice(i, i + 2), 16));
    }
    if (/^[\x20-\x7e]+$/.test(decoded) && /^\d{4}[0-9A-Fa-f]{16}/.test(decoded)) {
      return { text: decoded, note: 'Input looked like a hex dump of an ASCII message and was decoded.' };
    }
  }

  if (stripSpaces) {
    return { text: noSpaces, note: 'Spaces were stripped from the input.' };
  }
  return { text: noBreaks };
}

function interpret(
  de: number,
  raw: string,
  currency: string | undefined,
): string | undefined {
  switch (de) {
    case 3:
      return describeProcessingCode(raw);
    case 4:
    case 5:
    case 6: {
      const cur = de === 4 ? currency : undefined;
      const symbol = cur ? ` ${CURRENCIES[cur]?.slice(0, 3) ?? ''}`.trimEnd() : '';
      return `${formatAmount(raw, cur)}${symbol}`.trim();
    }
    case 7:
    case 12:
    case 13:
    case 15:
    case 16:
    case 17:
      return describeDateTime(raw);
    case 14:
      return raw.length === 4 ? `Expires 20${raw.slice(0, 2)}-${raw.slice(2, 4)}` : undefined;
    case 22:
      return describePosEntryMode(raw);
    case 25:
      return POS_CONDITION_CODES[raw] ?? `Unknown POS condition code (${raw})`;
    case 39: {
      const meaning = RESPONSE_CODES[raw.toUpperCase()];
      if (!meaning) return `Unknown response code (${raw})`;
      return raw === '00' || raw === '08' || raw === '10' || raw === '11'
        ? `${meaning} ✓`
        : `${meaning} ✗`;
    }
    case 49:
    case 50:
    case 51:
      return CURRENCIES[raw] ?? `ISO 4217 code ${raw}`;
    case 70:
      return NETWORK_CODES[raw] ?? `Unknown network code (${raw})`;
    case 90:
      return describeOriginalDataElements(raw);
    case 18:
      return 'Merchant category code — see ISO 18245';
    case 41:
      return 'Terminal ID (TID)';
    case 42:
      return 'Merchant ID (MID)';
    default:
      return undefined;
  }
}

export function parseMessage(input: string, options: ParseOptions = {}): ParseResult {
  const {
    headerLength = 0,
    maskSensitive = true,
    binaryLengthInBytes = true,
    stripSpaces = false,
  } = options;
  const warnings: ParseWarning[] = [];
  const fields: ParsedField[] = [];

  const { text: message, note } = normalizeInput(input, stripSpaces);
  if (note) warnings.push({ message: note });

  if (!message) {
    return { ok: false, normalized: '', fields, warnings, error: 'Nothing to parse — paste a message first.' };
  }

  let cursor = 0;
  let header: string | undefined;
  if (headerLength > 0) {
    if (message.length < headerLength) {
      return {
        ok: false,
        normalized: message,
        fields,
        warnings,
        error: `Header length ${headerLength} exceeds the message length (${message.length}).`,
      };
    }
    header = message.slice(0, headerLength);
    cursor = headerLength;
  }

  // --- MTI ---
  const mtiRaw = message.slice(cursor, cursor + 4);
  if (!isValidMti(mtiRaw)) {
    return {
      ok: false,
      normalized: message,
      header,
      fields,
      warnings,
      error: `Expected a 4-digit MTI at position ${cursor}, found "${mtiRaw}". If the message has a TPDU or length header, set the header length.`,
    };
  }
  const mti = decodeMti(mtiRaw);
  cursor += 4;

  // --- Bitmap ---
  let bitmapResult;
  try {
    bitmapResult = readBitmap(message, cursor);
  } catch (err) {
    return {
      ok: false,
      normalized: message,
      header,
      mti,
      fields,
      warnings,
      error: err instanceof Error ? err.message : String(err),
    };
  }
  const { bitmap } = bitmapResult;
  cursor = bitmapResult.next;

  // --- Data elements, in bitmap order ---
  for (const de of bitmap.presentFields) {
    const spec = getSpec(de);
    if (!spec) {
      warnings.push({ de, message: `No specification for DE ${de}; stopped reading here.` });
      break;
    }

    const pfx = prefixLength(spec);
    let lengthPrefix: string | undefined;
    let valueChars: number;

    if (pfx > 0) {
      lengthPrefix = message.slice(cursor, cursor + pfx);
      if (lengthPrefix.length < pfx) {
        warnings.push({ de, message: `Message ended inside the length prefix of DE ${de}.` });
        break;
      }
      if (!/^\d+$/.test(lengthPrefix)) {
        warnings.push({
          de,
          message: `DE ${de} length prefix "${lengthPrefix}" is not numeric — the message is probably misaligned before this point.`,
        });
        break;
      }
      cursor += pfx;
      const declared = parseInt(lengthPrefix, 10);
      if (declared > spec.length) {
        warnings.push({
          de,
          message: `DE ${de} declares ${declared}, above the ISO maximum of ${spec.length}. Read anyway.`,
        });
      }
      valueChars = spec.content === 'b' && binaryLengthInBytes ? declared * 2 : declared;
    } else {
      valueChars = spec.length;
    }

    const raw = message.slice(cursor, cursor + valueChars);
    if (raw.length < valueChars) {
      warnings.push({
        de,
        message: `DE ${de} needs ${valueChars} characters but only ${raw.length} remain. Read what was there.`,
      });
    }
    const offset = cursor;
    cursor += raw.length;

    fields.push({
      de,
      name: spec.name,
      spec,
      raw,
      display: maskSensitive && spec.sensitive ? maskField(de, raw) : raw,
      lengthPrefix,
      offset,
    });

    if (raw.length < valueChars) break;
  }

  // --- Second pass: interpretations that depend on other fields ---
  const currency = fields.find((f) => f.de === 49)?.raw;
  for (const field of fields) {
    field.interpretation = interpret(field.de, field.raw, currency);
    if (field.de === 55) {
      const tlv = parseTlv(field.raw);
      field.children = tlv.nodes;
      if (tlv.error) {
        warnings.push({
          de: 55,
          message: `${tlv.error} Try toggling whether the DE55 length prefix counts bytes or characters.`,
        });
      }
    }
  }

  const trailing = message.slice(cursor);
  if (trailing.length > 0) {
    warnings.push({
      message: `${trailing.length} character(s) left over after the last field. Often a MAC or a trailer the bitmap did not declare.`,
    });
  }

  return {
    ok: true,
    normalized: message,
    header,
    mti,
    bitmap,
    fields,
    warnings,
    trailing: trailing || undefined,
  };
}
