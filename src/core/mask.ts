/**
 * Nothing sensitive should reach the screen in full. Real traces get pasted
 * into tools like this one during incidents, so the default is to mask and
 * let the user opt out deliberately.
 */

/** Keep the BIN and the last four, hide the middle. */
export function maskPan(pan: string): string {
  const digits = pan.replace(/\D/g, '');
  if (digits.length < 10) return '*'.repeat(digits.length);
  return `${digits.slice(0, 6)}${'*'.repeat(digits.length - 10)}${digits.slice(-4)}`;
}

/** Track 2 is PAN = expiry + service code + discretionary data. */
export function maskTrack2(track: string): string {
  const sepIndex = track.search(/[=D]/i);
  if (sepIndex === -1) return maskPan(track);
  const pan = track.slice(0, sepIndex);
  const sep = track[sepIndex];
  const rest = track.slice(sepIndex + 1);
  // Keep the expiry (first 4) so the field is still diagnosable, hide the rest.
  const tail = rest.length > 4 ? `${rest.slice(0, 4)}${'*'.repeat(rest.length - 4)}` : rest;
  return `${maskPan(pan)}${sep}${tail}`;
}

export function maskAll(value: string): string {
  return '*'.repeat(value.length);
}

export function maskExpiry(value: string): string {
  return value.length === 4 ? `${value.slice(0, 2)}**` : maskAll(value);
}

export function maskField(de: number, value: string): string {
  switch (de) {
    case 2:
    case 34:
      return maskPan(value);
    case 35:
    case 36:
      return maskTrack2(value);
    case 45:
      return maskTrack2(value);
    case 14:
      return maskExpiry(value);
    case 52:
      return maskAll(value);
    case 102:
    case 103:
      return maskPan(value);
    default:
      return value;
  }
}
