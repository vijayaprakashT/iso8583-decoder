import type { MtiInfo } from './types';

const VERSIONS: Record<string, string> = {
  '0': 'ISO 8583:1987',
  '1': 'ISO 8583:1993',
  '2': 'ISO 8583:2003',
  '3': 'Reserved by ISO',
  '4': 'Reserved by ISO',
  '5': 'Reserved by ISO',
  '6': 'Reserved by ISO',
  '7': 'Reserved by ISO',
  '8': 'National use',
  '9': 'Private use',
};

const CLASSES: Record<string, string> = {
  '0': 'Reserved by ISO',
  '1': 'Authorization',
  '2': 'Financial',
  '3': 'File action',
  '4': 'Reversal / chargeback',
  '5': 'Reconciliation',
  '6': 'Administrative',
  '7': 'Fee collection',
  '8': 'Network management',
  '9': 'Reserved by ISO',
};

const FUNCTIONS: Record<string, string> = {
  '0': 'Request',
  '1': 'Request response',
  '2': 'Advice',
  '3': 'Advice response',
  '4': 'Notification',
  '5': 'Notification acknowledgement',
  '6': 'Instruction',
  '7': 'Instruction acknowledgement',
  '8': 'Reserved by ISO',
  '9': 'Reserved by ISO',
};

const ORIGINS: Record<string, string> = {
  '0': 'Acquirer',
  '1': 'Acquirer repeat',
  '2': 'Issuer',
  '3': 'Issuer repeat',
  '4': 'Other',
  '5': 'Other repeat',
  '6': 'Reserved by ISO',
  '7': 'Reserved by ISO',
  '8': 'Reserved by ISO',
  '9': 'Reserved by ISO',
};

/**
 * Well-known MTIs, so the common cases read naturally rather than as a
 * mechanical join of the four positions.
 */
const COMMON: Record<string, string> = {
  '0100': 'Authorization request — asks the issuer to reserve funds',
  '0110': 'Authorization response — the issuer answers, DE39 carries the outcome',
  '0120': 'Authorization advice — the acquirer informs the issuer after the fact',
  '0130': 'Authorization advice response',
  '0200': 'Financial request — authorize and clear in one message',
  '0210': 'Financial response',
  '0220': 'Financial advice — typically an offline or completion message',
  '0230': 'Financial advice response',
  '0320': 'Batch upload / file action advice',
  '0400': 'Reversal request — undo a transaction, DE90 identifies the original',
  '0410': 'Reversal response',
  '0420': 'Reversal advice',
  '0430': 'Reversal advice response',
  '0500': 'Reconciliation request — settlement cut-over',
  '0510': 'Reconciliation response',
  '0600': 'Administrative request',
  '0610': 'Administrative response',
  '0800': 'Network management request — sign-on, sign-off or echo test',
  '0810': 'Network management response',
};

export function decodeMti(mti: string): MtiInfo {
  const [v, c, f, o] = mti.split('');
  const version = VERSIONS[v] ?? 'Unknown version';
  const messageClass = CLASSES[c] ?? 'Unknown class';
  const messageFunction = FUNCTIONS[f] ?? 'Unknown function';
  const messageOrigin = ORIGINS[o] ?? 'Unknown origin';

  const summary =
    COMMON[mti] ?? `${messageClass} ${messageFunction.toLowerCase()} from ${messageOrigin.toLowerCase()}`;

  return { mti, version, messageClass, messageFunction, messageOrigin, summary };
}

export function isValidMti(mti: string): boolean {
  return /^\d{4}$/.test(mti);
}
