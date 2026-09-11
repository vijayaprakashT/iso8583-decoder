import { describe, expect, it } from 'vitest';
import { bitsToHex, buildBitmap, hexToBits, readBitmap } from '../bitmap';
import { buildMessage } from '../builder';
import { describePosEntryMode, describeProcessingCode, formatAmount } from '../codes';
import { parseTlv } from '../emv';
import { maskPan, maskTrack2 } from '../mask';
import { decodeMti } from '../mti';
import { normalizeInput, parseMessage } from '../parser';
import { SAMPLES, renderSample } from '../samples';

describe('MTI', () => {
  it('decodes the four positions', () => {
    const mti = decodeMti('0100');
    expect(mti.version).toBe('ISO 8583:1987');
    expect(mti.messageClass).toBe('Authorization');
    expect(mti.messageFunction).toBe('Request');
    expect(mti.messageOrigin).toBe('Acquirer');
  });

  it('recognises well-known MTIs', () => {
    expect(decodeMti('0400').summary).toMatch(/Reversal request/);
    expect(decodeMti('0810').summary).toMatch(/Network management/);
  });

  it('falls back to a composed summary for uncommon MTIs', () => {
    expect(decodeMti('0522').summary).toBe('Reconciliation advice from issuer');
  });
});

describe('bitmap', () => {
  it('round-trips hex to bits', () => {
    expect(bitsToHex(hexToBits('7234054128C08000'))).toBe('7234054128C08000');
  });

  it('sets bit 1 only when a secondary bitmap is needed', () => {
    expect(buildBitmap([2, 3, 4])).toHaveLength(16);
    expect(buildBitmap([2, 70])).toHaveLength(32);
    // Bit 1 lives in the high bit of the first nibble, alongside bits 2–4.
    expect(parseInt(buildBitmap([2, 70])[0], 16) & 0b1000).toBeTruthy();
    expect(parseInt(buildBitmap([2, 3, 4])[0], 16) & 0b1000).toBeFalsy();
  });

  it('lists present fields excluding DE1', () => {
    // Bits for DE2, DE3, DE4 → 0111 0000 ...
    const hex = buildBitmap([2, 3, 4]);
    const { bitmap } = readBitmap(hex, 0);
    expect(bitmap.presentFields).toEqual([2, 3, 4]);
  });

  it('reads a secondary bitmap when indicated', () => {
    const hex = buildBitmap([2, 70, 128]);
    const { bitmap, next } = readBitmap(hex, 0);
    expect(bitmap.secondaryHex).toBeDefined();
    expect(bitmap.presentFields).toEqual([2, 70, 128]);
    expect(next).toBe(32);
  });

  it('rejects a truncated bitmap', () => {
    expect(() => readBitmap('7234', 0)).toThrow(/ended inside the primary bitmap/);
  });

  it('rejects non-hex bitmaps', () => {
    expect(() => readBitmap('ZZZZZZZZZZZZZZZZ', 0)).toThrow(/not valid hex/);
  });
});

describe('round trip', () => {
  it.each(SAMPLES.map((s) => [s.title, s] as const))('%s packs and unpacks losslessly', (_title, sample) => {
    const wire = renderSample(sample);
    const parsed = parseMessage(wire, { maskSensitive: false });

    expect(parsed.ok).toBe(true);
    expect(parsed.error).toBeUndefined();
    expect(parsed.mti?.mti).toBe(sample.mti);
    expect(parsed.trailing).toBeUndefined();

    const expectedFields = Object.keys(sample.fields).map(Number).sort((a, b) => a - b);
    expect(parsed.bitmap?.presentFields).toEqual(expectedFields);

    for (const field of parsed.fields) {
      const original = sample.fields[field.de];
      // Fixed-length fields are padded by the builder, so compare trimmed.
      expect(field.raw.trim()).toBe(original.trim());
    }
  });

  it('produces no parse warnings for the sample set', () => {
    for (const sample of SAMPLES) {
      const parsed = parseMessage(renderSample(sample), { maskSensitive: false });
      expect(parsed.warnings, `${sample.title}: ${JSON.stringify(parsed.warnings)}`).toEqual([]);
    }
  });
});

describe('parseMessage', () => {
  const wire = renderSample(SAMPLES[0]);

  it('interprets the response code', () => {
    const approved = parseMessage(renderSample(SAMPLES[1]));
    expect(approved.fields.find((f) => f.de === 39)?.interpretation).toMatch(/Approved/);

    const declined = parseMessage(renderSample(SAMPLES[2]));
    expect(declined.fields.find((f) => f.de === 39)?.interpretation).toMatch(/Insufficient funds/);
  });

  it('formats the amount using the transaction currency', () => {
    const parsed = parseMessage(wire);
    expect(parsed.fields.find((f) => f.de === 4)?.interpretation).toMatch(/125\.50/);
  });

  it('masks the PAN and track 2 by default', () => {
    const parsed = parseMessage(wire);
    const pan = parsed.fields.find((f) => f.de === 2);
    expect(pan?.display).toBe('411111******1111');
    expect(pan?.raw).toBe('4111111111111111');
    expect(parsed.fields.find((f) => f.de === 35)?.display).not.toContain('1111111111');
  });

  it('leaves values intact when masking is off', () => {
    const parsed = parseMessage(wire, { maskSensitive: false });
    expect(parsed.fields.find((f) => f.de === 2)?.display).toBe('4111111111111111');
  });

  it('parses DE55 into an EMV tree', () => {
    const parsed = parseMessage(wire);
    const de55 = parsed.fields.find((f) => f.de === 55);
    expect(de55?.children?.length).toBeGreaterThan(10);
    const cryptogram = de55?.children?.find((n) => n.tag === '9F26');
    expect(cryptogram?.value).toBe('A1B2C3D4E5F60718');
    const cid = de55?.children?.find((n) => n.tag === '9F27');
    expect(cid?.interpretation).toMatch(/ARQC/);
  });

  it('reports a bad MTI rather than guessing', () => {
    const parsed = parseMessage('XX00' + wire.slice(4));
    expect(parsed.ok).toBe(false);
    expect(parsed.error).toMatch(/Expected a 4-digit MTI/);
  });

  it('handles a header before the MTI', () => {
    const withHeader = parseMessage(`6000030000${wire}`, { headerLength: 10 });
    expect(withHeader.ok).toBe(true);
    expect(withHeader.header).toBe('6000030000');
    expect(withHeader.mti?.mti).toBe('0100');
  });

  it('warns instead of throwing when the message is truncated mid-field', () => {
    const parsed = parseMessage(wire.slice(0, wire.length - 30));
    expect(parsed.ok).toBe(true);
    expect(parsed.warnings.some((w) => /only .* remain/.test(w.message))).toBe(true);
  });

  it('flags trailing characters the bitmap did not declare', () => {
    const parsed = parseMessage(`${wire}ABCD`);
    expect(parsed.trailing).toBe('ABCD');
    expect(parsed.warnings.some((w) => /left over/.test(w.message))).toBe(true);
  });

  it('detects a misaligned variable-length prefix', () => {
    // Corrupt the DE2 length prefix so it is no longer numeric.
    const broken = `${wire.slice(0, 20)}XX${wire.slice(22)}`;
    const parsed = parseMessage(broken);
    expect(parsed.warnings.some((w) => /not numeric/.test(w.message))).toBe(true);
  });

  it('rejects an empty input politely', () => {
    expect(parseMessage('   ').error).toMatch(/Nothing to parse/);
  });
});

describe('normalizeInput', () => {
  it('strips line breaks but keeps spaces', () => {
    expect(normalizeInput('0100\n7234\tAB CD').text).toBe('01007234AB CD');
  });

  it('strips spaces when asked', () => {
    expect(normalizeInput('0100 7234 ABCD', true).text).toBe('01007234ABCD');
  });

  it('decodes a hex dump of an ASCII message', () => {
    const wire = renderSample(SAMPLES[5]);
    const dump = Array.from(wire)
      .map((c) => c.charCodeAt(0).toString(16).padStart(2, '0'))
      .join('');
    const result = normalizeInput(dump);
    expect(result.text).toBe(wire);
    expect(result.note).toMatch(/hex dump/);
  });

  it('does not mangle an ASCII message that happens to look like hex', () => {
    // 0800 message body is digits only; it must not be hex-decoded.
    const wire = renderSample(SAMPLES[5]);
    expect(normalizeInput(wire).text).toBe(wire);
  });
});

describe('EMV TLV', () => {
  it('parses a simple run of tags', () => {
    const { nodes, error } = parseTlv('9F2701809A03260912');
    expect(error).toBeUndefined();
    expect(nodes).toHaveLength(2);
    expect(nodes[0].tag).toBe('9F27');
    expect(nodes[1].name).toBe('Transaction Date');
    expect(nodes[1].interpretation).toBe('2026-09-12');
  });

  it('recurses into constructed tags', () => {
    // 77 (constructed) wrapping 9F27 01 80
    const { nodes } = parseTlv('7704 9F270180'.replace(/ /g, ''));
    expect(nodes[0].constructed).toBe(true);
    expect(nodes[0].children?.[0].tag).toBe('9F27');
  });

  it('handles long-form lengths', () => {
    const value = 'AB'.repeat(200);
    const { nodes, error } = parseTlv(`9F4681C8${value}`);
    expect(error).toBeUndefined();
    expect(nodes[0].length).toBe(200);
    expect(nodes[0].value).toBe(value);
  });

  it('decodes the cryptogram information data', () => {
    expect(parseTlv('9F270180').nodes[0].interpretation).toMatch(/ARQC/);
    expect(parseTlv('9F270140').nodes[0].interpretation).toMatch(/TC — approved offline/);
    expect(parseTlv('9F270100').nodes[0].interpretation).toMatch(/AAC — declined offline/);
  });

  it('decodes terminal verification results bit by bit', () => {
    expect(parseTlv('95050000008000').nodes[0].interpretation).toBe('Transaction exceeds floor limit');
    expect(parseTlv('95050000000000').nodes[0].interpretation).toMatch(/All checks passed/);
    expect(parseTlv('95058000000000').nodes[0].interpretation).toMatch(/not performed/);
  });

  it('returns what it parsed plus an error on a truncated tail', () => {
    const { nodes, error } = parseTlv('9F2701809F2608A1B2');
    expect(nodes).toHaveLength(1);
    expect(error).toMatch(/declares 8 bytes/);
  });

  it('rejects an odd number of hex characters', () => {
    expect(parseTlv('9F270180').error).toBeUndefined();
    expect(parseTlv('9F27018').error).toMatch(/odd number/);
  });

  it('names unknown tags rather than dropping them', () => {
    const { nodes } = parseTlv('DF01020102');
    expect(nodes[0].name).toBe('Unknown or proprietary tag');
    expect(nodes[0].value).toBe('0102');
  });
});

describe('code interpretation', () => {
  it('splits the processing code into its three parts', () => {
    expect(describeProcessingCode('001000')).toBe('Purchase (goods and services) · from Savings · to Default / unspecified');
  });

  it('splits POS entry mode into capture method and PIN capability', () => {
    expect(describePosEntryMode('051')).toBe('Chip (ICC), CVV can be checked · Terminal can accept PIN');
    expect(describePosEntryMode('802')).toMatch(/Magnetic stripe fallback/);
  });

  it('formats amounts with the right minor units', () => {
    expect(formatAmount('000000012550')).toBe('125.50');
    expect(formatAmount('000000012550', '392')).toBe('12550'); // JPY has no minor unit
    expect(formatAmount('000000150000')).toBe('1,500.00');
  });
});

describe('masking', () => {
  it('keeps the BIN and last four', () => {
    expect(maskPan('4111111111111111')).toBe('411111******1111');
  });

  it('keeps the expiry in track 2 but hides the discretionary data', () => {
    const masked = maskTrack2('4111111111111111=28091010000012300000');
    expect(masked.startsWith('411111******1111=2809')).toBe(true);
    expect(masked).not.toContain('1010000012300000');
  });
});

describe('builder', () => {
  it('rejects an invalid MTI', () => {
    expect(buildMessage('01', { 2: '4111111111111111' }).ok).toBe(false);
  });

  it('pads fixed-length numeric fields on the left', () => {
    const built = buildMessage('0800', { 11: '1' });
    expect(built.ok).toBe(true);
    expect(built.message.endsWith('000001')).toBe(true);
  });

  it('writes the DE55 length prefix in bytes', () => {
    const built = buildMessage('0100', { 55: '9F270180' });
    // 8 hex characters = 4 bytes → prefix "004"
    expect(built.message.endsWith('0049F270180')).toBe(true);
  });

  it('flags a value above the ISO maximum', () => {
    const built = buildMessage('0100', { 2: '1'.repeat(25) });
    expect(built.ok).toBe(false);
    expect(built.errors[0]).toMatch(/above the ISO maximum/);
  });
});
