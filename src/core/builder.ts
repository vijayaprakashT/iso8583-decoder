import { buildBitmap } from './bitmap';
import { getSpec, prefixLength } from './fields';
import { isValidMti } from './mti';

export interface BuildOptions {
  /** Characters to place before the MTI (TPDU, length header). */
  header?: string;
  /** Match the parser: a variable binary field's prefix counts bytes. */
  binaryLengthInBytes?: boolean;
  /** Pad or reject fixed-length fields that do not match their spec. */
  padFixed?: boolean;
}

export interface BuildResult {
  ok: boolean;
  message: string;
  bitmap: string;
  errors: string[];
}

/** Pad a fixed-length field the way its content type expects. */
function padFixedValue(value: string, length: number, numeric: boolean): string {
  if (value.length >= length) return value.slice(0, length);
  return numeric ? value.padStart(length, '0') : value.padEnd(length, ' ');
}

/**
 * Pack a set of data elements back into a message.
 * The inverse of parseMessage — useful for producing test vectors, and the
 * fastest way to prove the parser round-trips.
 */
export function buildMessage(
  mti: string,
  data: Record<number, string>,
  options: BuildOptions = {},
): BuildResult {
  const { header = '', binaryLengthInBytes = true, padFixed = true } = options;
  const errors: string[] = [];

  if (!isValidMti(mti)) {
    return { ok: false, message: '', bitmap: '', errors: [`"${mti}" is not a 4-digit MTI.`] };
  }

  const des = Object.keys(data)
    .map(Number)
    .filter((n) => !Number.isNaN(n))
    .sort((a, b) => a - b);

  if (des.length === 0) {
    return { ok: false, message: '', bitmap: '', errors: ['No data elements supplied.'] };
  }

  let bitmap: string;
  try {
    bitmap = buildBitmap(des);
  } catch (err) {
    return { ok: false, message: '', bitmap: '', errors: [err instanceof Error ? err.message : String(err)] };
  }

  let body = '';
  for (const de of des) {
    const spec = getSpec(de);
    if (!spec) {
      errors.push(`No specification for DE ${de}.`);
      continue;
    }
    let value = data[de] ?? '';
    const pfx = prefixLength(spec);
    const numeric = spec.content === 'n' || spec.content === 'z';

    if (pfx === 0) {
      if (value.length !== spec.length) {
        if (padFixed) {
          value = padFixedValue(value, spec.length, numeric);
        } else {
          errors.push(`DE ${de} must be exactly ${spec.length} characters, got ${value.length}.`);
          continue;
        }
      }
      body += value;
    } else {
      const declared = spec.content === 'b' && binaryLengthInBytes ? Math.ceil(value.length / 2) : value.length;
      if (declared > spec.length) {
        errors.push(`DE ${de} is ${declared}, above the ISO maximum of ${spec.length}.`);
      }
      body += String(declared).padStart(pfx, '0') + value;
    }
  }

  return {
    ok: errors.length === 0,
    message: `${header}${mti}${bitmap}${body}`,
    bitmap,
    errors,
  };
}
