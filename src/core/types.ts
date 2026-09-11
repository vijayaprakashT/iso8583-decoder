/**
 * Core types for the ISO 8583 decoder.
 */

/** How the data element's length is determined. */
export type LengthType =
  | 'fixed' // length is exactly `length` characters
  | 'LLVAR' // 2-digit length prefix, up to 99
  | 'LLLVAR'; // 3-digit length prefix, up to 999

/**
 * ISO 8583 content types.
 *  n   numeric digits
 *  a   alphabetic
 *  s   special characters
 *  an  alphanumeric
 *  ans alphanumeric + special
 *  b   binary (rendered as hex characters in this tool)
 *  z   track 2/3 data (digits plus the = and D separators)
 *  x+n amount preceded by a C/D credit-debit indicator
 */
export type ContentType = 'n' | 'a' | 's' | 'an' | 'ans' | 'b' | 'z' | 'x+n';

export interface FieldSpec {
  /** Data element number, 1–128. */
  de: number;
  /** Human-readable name from the ISO 8583 standard. */
  name: string;
  /** Content type. */
  content: ContentType;
  /** Fixed length, or the maximum length for variable fields. */
  length: number;
  lengthType: LengthType;
  /** Short explanation shown in the UI. */
  description?: string;
  /**
   * True when the field carries sensitive data that must be masked before
   * display (PAN, track data, PIN blocks).
   */
  sensitive?: boolean;
}

export interface ParsedField {
  de: number;
  name: string;
  spec: FieldSpec;
  /** Raw characters as they appeared in the message, length prefix excluded. */
  raw: string;
  /** Display value — masked when the field is sensitive. */
  display: string;
  /** The 2- or 3-digit length prefix, for variable-length fields. */
  lengthPrefix?: string;
  /** Byte offset of the value within the message. */
  offset: number;
  /** Extra human-readable interpretation, e.g. "00 — Approved". */
  interpretation?: string;
  /** Structured sub-fields, currently only used for DE55 EMV data. */
  children?: TlvNode[];
}

export interface TlvNode {
  tag: string;
  name: string;
  length: number;
  value: string;
  constructed: boolean;
  interpretation?: string;
  children?: TlvNode[];
}

export interface MtiInfo {
  mti: string;
  version: string;
  messageClass: string;
  messageFunction: string;
  messageOrigin: string;
  /** One-line plain-language summary, e.g. "Authorization request from acquirer". */
  summary: string;
}

export interface BitmapInfo {
  /** 16 hex characters. */
  primaryHex: string;
  /** 16 hex characters, when field 1 indicates a secondary bitmap. */
  secondaryHex?: string;
  /** Sorted list of data element numbers present in the message. */
  presentFields: number[];
  /** 128 booleans, index 0 = DE1. */
  bits: boolean[];
}

export interface ParseWarning {
  de?: number;
  message: string;
}

export interface ParseResult {
  ok: boolean;
  /** The message after any preprocessing (hex-dump decoding, whitespace strip). */
  normalized: string;
  header?: string;
  mti?: MtiInfo;
  bitmap?: BitmapInfo;
  fields: ParsedField[];
  warnings: ParseWarning[];
  error?: string;
  /** Characters left over after the last parsed field. */
  trailing?: string;
}

export interface ParseOptions {
  /**
   * Number of leading characters to treat as a header (TPDU, length prefix,
   * or similar) and skip before the MTI. Defaults to 0.
   */
  headerLength?: number;
  /** Mask PAN, track data and PIN blocks in the display value. Defaults to true. */
  maskSensitive?: boolean;
  /**
   * For variable-length binary fields (DE55 above all), does the LLL prefix
   * count bytes or hex characters?
   *
   * The standard counts bytes, and most switches follow it — 003 means three
   * bytes, which is six hex characters on the wire. Some processors count
   * characters instead. Getting this wrong is the single most common reason a
   * DE55 parse slides out of alignment, so it is exposed rather than assumed.
   *
   * Defaults to true (bytes).
   */
  binaryLengthInBytes?: boolean;
  /**
   * Remove spaces from the input before parsing. Off by default, because
   * ans fields such as DE43 are legitimately space-padded. Turn it on when
   * the paste has cosmetic spacing between bytes.
   */
  stripSpaces?: boolean;
}
