import type { BitmapInfo } from './types';

/**
 * The bitmap is the packing list taped to the lid of the suitcase: 64 bits,
 * one per data element, telling you which fields are inside and in what order
 * to read them. Bit 1 of the primary bitmap is special — when it is set, a
 * second 64-bit bitmap follows, covering DE 65–128.
 */

const HEX = /^[0-9A-Fa-f]+$/;

/** Expand a run of hex characters into an array of booleans, MSB first. */
export function hexToBits(hex: string): boolean[] {
  const bits: boolean[] = [];
  for (const ch of hex) {
    const nibble = parseInt(ch, 16);
    if (Number.isNaN(nibble)) {
      throw new Error(`Invalid hex character in bitmap: "${ch}"`);
    }
    bits.push(
      (nibble & 0b1000) !== 0,
      (nibble & 0b0100) !== 0,
      (nibble & 0b0010) !== 0,
      (nibble & 0b0001) !== 0,
    );
  }
  return bits;
}

/** Collapse booleans back into hex characters, MSB first. */
export function bitsToHex(bits: boolean[]): string {
  let out = '';
  for (let i = 0; i < bits.length; i += 4) {
    const nibble =
      (bits[i] ? 8 : 0) + (bits[i + 1] ? 4 : 0) + (bits[i + 2] ? 2 : 0) + (bits[i + 3] ? 1 : 0);
    out += nibble.toString(16).toUpperCase();
  }
  return out;
}

/**
 * Read the bitmap(s) from the message.
 *
 * @param message the full normalized message
 * @param offset  index of the first bitmap character
 * @returns the bitmap info and the offset where the data elements begin
 */
export function readBitmap(message: string, offset: number): { bitmap: BitmapInfo; next: number } {
  const primaryHex = message.slice(offset, offset + 16);
  if (primaryHex.length < 16) {
    throw new Error(
      `Message ended inside the primary bitmap — expected 16 hex characters, found ${primaryHex.length}.`,
    );
  }
  if (!HEX.test(primaryHex)) {
    throw new Error(`Primary bitmap "${primaryHex}" is not valid hex.`);
  }

  let bits = hexToBits(primaryHex);
  let next = offset + 16;
  let secondaryHex: string | undefined;

  // Bit 1 set means a secondary bitmap follows.
  if (bits[0]) {
    secondaryHex = message.slice(next, next + 16);
    if (secondaryHex.length < 16) {
      throw new Error(
        `Primary bitmap indicates a secondary bitmap, but only ${secondaryHex.length} of 16 characters remain.`,
      );
    }
    if (!HEX.test(secondaryHex)) {
      throw new Error(`Secondary bitmap "${secondaryHex}" is not valid hex.`);
    }
    bits = bits.concat(hexToBits(secondaryHex));
    next += 16;
  }

  const presentFields: number[] = [];
  bits.forEach((set, i) => {
    // DE1 is the secondary-bitmap indicator, not a data element in the stream.
    if (set && i !== 0) presentFields.push(i + 1);
  });

  return {
    bitmap: { primaryHex: primaryHex.toUpperCase(), secondaryHex: secondaryHex?.toUpperCase(), presentFields, bits },
    next,
  };
}

/** Build the bitmap hex for a set of data element numbers. */
export function buildBitmap(fields: number[]): string {
  const needsSecondary = fields.some((f) => f > 64);
  const size = needsSecondary ? 128 : 64;
  const bits = new Array<boolean>(size).fill(false);

  if (needsSecondary) bits[0] = true;
  for (const f of fields) {
    if (f < 2 || f > 128) throw new Error(`Data element ${f} is out of range (2–128).`);
    bits[f - 1] = true;
  }
  return bitsToHex(bits);
}
