import { useMemo, useState } from 'react';
import { buildMessage } from '../core/builder';
import { getSpec } from '../core/fields';
import { SAMPLES } from '../core/samples';

interface Row {
  de: string;
  value: string;
}

const INITIAL: Row[] = Object.entries(SAMPLES[5].fields).map(([de, value]) => ({ de, value }));

export function Builder({ onSendToDecoder }: { onSendToDecoder: (message: string) => void }) {
  const [mti, setMti] = useState(SAMPLES[5].mti);
  const [rows, setRows] = useState<Row[]>(INITIAL);

  const result = useMemo(() => {
    const data: Record<number, string> = {};
    for (const r of rows) {
      const n = parseInt(r.de, 10);
      if (!Number.isNaN(n) && n >= 2 && n <= 128) data[n] = r.value;
    }
    if (Object.keys(data).length === 0) {
      return { ok: false, message: '', bitmap: '', errors: ['Add at least one data element.'] };
    }
    return buildMessage(mti, data);
  }, [mti, rows]);

  const update = (i: number, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <>
      <section className="panel">
        <h2>Builder</h2>
        <p className="hint">
          The inverse of the decoder: give it fields, it computes the bitmap and packs the message.
          Handy for producing test vectors — and it is what the test suite round-trips against.
        </p>

        <div className="controls" style={{ marginTop: 0, marginBottom: 14 }}>
          <label className="num">
            MTI
            <input
              type="text"
              value={mti}
              maxLength={4}
              style={{ width: 70, fontFamily: 'var(--mono)' }}
              onChange={(e) => setMti(e.target.value.replace(/\D/g, ''))}
            />
          </label>
          <button className="ghost" onClick={() => setRows((r) => [...r, { de: '', value: '' }])}>
            + Add field
          </button>
          <button className="ghost" onClick={() => setRows(INITIAL)}>
            Reset
          </button>
        </div>

        {rows.map((row, i) => {
          const spec = getSpec(parseInt(row.de, 10));
          return (
            <div key={i}>
              <div className="builder-row">
                <input
                  type="text"
                  placeholder="DE"
                  value={row.de}
                  style={{ fontFamily: 'var(--mono)' }}
                  onChange={(e) => update(i, { de: e.target.value.replace(/\D/g, '') })}
                />
                <input
                  type="text"
                  placeholder="value"
                  value={row.value}
                  style={{ fontFamily: 'var(--mono)' }}
                  onChange={(e) => update(i, { value: e.target.value })}
                />
                <button
                  className="ghost"
                  aria-label={`Remove field ${row.de}`}
                  onClick={() => setRows((prev) => prev.filter((_, j) => j !== i))}
                >
                  ×
                </button>
              </div>
              {spec && (
                <div className="builder-row">
                  <span />
                  <div className="fname">
                    {spec.name} · {spec.lengthType === 'fixed' ? `fixed ${spec.length}` : `${spec.lengthType} up to ${spec.length}`} ·{' '}
                    {spec.content}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </section>

      <section className="panel">
        <h2>Packed message</h2>
        {result.errors.length > 0 && (
          <div className="notice error">
            <ul>
              {result.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        )}
        {result.message && (
          <>
            <div className="builder-out">{result.message}</div>
            <div className="controls">
              <span style={{ color: 'var(--muted)', fontSize: 12.5 }}>
                Bitmap <b style={{ fontFamily: 'var(--mono)' }}>{result.bitmap}</b> · {result.message.length} characters
              </span>
              <button className="primary" onClick={() => onSendToDecoder(result.message)}>
                Send to decoder
              </button>
              <button className="ghost" onClick={() => navigator.clipboard?.writeText(result.message)}>
                Copy
              </button>
            </div>
          </>
        )}
      </section>
    </>
  );
}
