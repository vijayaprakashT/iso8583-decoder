import type { MtiInfo } from '../core/types';

const POSITIONS = ['Version', 'Message class', 'Message function', 'Message origin'] as const;

export function MtiCard({ mti }: { mti: MtiInfo }) {
  const values = [mti.version, mti.messageClass, mti.messageFunction, mti.messageOrigin];

  return (
    <section className="panel">
      <h2>Message type indicator</h2>
      <div className="mti-summary">
        <span className="mti-digits">{mti.mti}</span>
        <span className="blurb">{mti.summary}</span>
      </div>
      <div className="mti-grid">
        {POSITIONS.map((label, i) => (
          <div className="mti-cell" key={label}>
            <div className="pos">
              Position {i + 1} · {label}
            </div>
            <div className="digit">{mti.mti[i]}</div>
            <div className="val">{values[i]}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
