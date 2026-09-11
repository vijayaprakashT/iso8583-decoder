import { useMemo, useState } from 'react';
import { parseMessage } from './core/parser';
import { SAMPLES, renderSample } from './core/samples';
import { BitmapGrid } from './ui/BitmapGrid';
import { Builder } from './ui/Builder';
import { FieldTable } from './ui/FieldTable';
import { MtiCard } from './ui/MtiCard';
import { TlvTree } from './ui/TlvTree';
import './ui/styles.css';

type Tab = 'decode' | 'build';

export default function App() {
  const [tab, setTab] = useState<Tab>('decode');
  const [input, setInput] = useState(() => renderSample(SAMPLES[0]));
  const [sampleId, setSampleId] = useState(SAMPLES[0].id);
  const [mask, setMask] = useState(true);
  const [headerLength, setHeaderLength] = useState(0);
  const [binaryBytes, setBinaryBytes] = useState(true);
  const [stripSpaces, setStripSpaces] = useState(false);

  const result = useMemo(
    () =>
      parseMessage(input, {
        maskSensitive: mask,
        headerLength,
        binaryLengthInBytes: binaryBytes,
        stripSpaces,
      }),
    [input, mask, headerLength, binaryBytes, stripSpaces],
  );

  const loadSample = (id: string) => {
    const sample = SAMPLES.find((s) => s.id === id);
    if (!sample) return;
    setSampleId(id);
    setHeaderLength(0);
    setInput(renderSample(sample));
  };

  const activeSample = SAMPLES.find((s) => s.id === sampleId);
  const de55 = result.fields.find((f) => f.de === 55);

  return (
    <div className="app">
      <header className="masthead">
        <div>
          <h1>ISO 8583 Decoder</h1>
          <p>
            Paste a raw transaction message and read it as fields instead of a wall of digits. MTI,
            bitmap, all 128 data elements, and BER-TLV decoding of the EMV chip data in DE 55.
          </p>
        </div>
        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'decode'} onClick={() => setTab('decode')}>
            Decode
          </button>
          <button role="tab" aria-selected={tab === 'build'} onClick={() => setTab('build')}>
            Build
          </button>
        </div>
      </header>

      {tab === 'build' ? (
        <Builder
          onSendToDecoder={(message) => {
            setInput(message);
            setTab('decode');
          }}
        />
      ) : (
        <>
          <section className="panel">
            <h2>Message</h2>
            <p className="hint">
              ASCII messages, or a hex dump of one — the decoder works out which. Nothing is
              uploaded anywhere; parsing happens entirely in this tab.
            </p>
            <textarea
              value={input}
              spellCheck={false}
              onChange={(e) => setInput(e.target.value)}
              aria-label="ISO 8583 message"
            />
            <div className="controls">
              <select value={sampleId} onChange={(e) => loadSample(e.target.value)} aria-label="Load a sample message">
                {SAMPLES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
              <label className="check">
                <input type="checkbox" checked={mask} onChange={(e) => setMask(e.target.checked)} />
                Mask PAN and PIN
              </label>
              <label className="num">
                Header length
                <input
                  type="number"
                  min={0}
                  max={64}
                  value={headerLength}
                  onChange={(e) => setHeaderLength(Math.max(0, Number(e.target.value) || 0))}
                />
              </label>
              <label className="check" title="ISO counts bytes; a few processors count characters.">
                <input
                  type="checkbox"
                  checked={binaryBytes}
                  onChange={(e) => setBinaryBytes(e.target.checked)}
                />
                DE 55 length in bytes
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={stripSpaces}
                  onChange={(e) => setStripSpaces(e.target.checked)}
                />
                Strip spaces
              </label>
              <button className="ghost" onClick={() => setInput('')}>
                Clear
              </button>
            </div>
            {activeSample && input === renderSample(activeSample) && (
              <p className="hint" style={{ marginTop: 12, marginBottom: 0 }}>
                {activeSample.blurb}
              </p>
            )}
          </section>

          {result.error && <div className="notice error">{result.error}</div>}

          {result.warnings.length > 0 && (
            <div className="notice warn">
              <b>{result.warnings.length === 1 ? 'Note' : 'Notes'}</b>
              <ul>
                {result.warnings.map((w, i) => (
                  <li key={i}>
                    {w.de ? `DE ${w.de}: ` : ''}
                    {w.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.ok && result.mti && result.bitmap && (
            <>
              <div className="stat-row">
                <div className="stat">
                  <div className="k">Fields</div>
                  <div className="v">{result.fields.length}</div>
                </div>
                <div className="stat">
                  <div className="k">Length</div>
                  <div className="v">{result.normalized.length}</div>
                </div>
                <div className="stat">
                  <div className="k">Bitmaps</div>
                  <div className="v">{result.bitmap.secondaryHex ? 2 : 1}</div>
                </div>
                <div className="stat">
                  <div className="k">Response</div>
                  <div className="v">{result.fields.find((f) => f.de === 39)?.raw ?? '—'}</div>
                </div>
              </div>

              {result.header && (
                <div className="notice info">
                  Header skipped: <code>{result.header}</code>
                </div>
              )}

              <MtiCard mti={result.mti} />
              <BitmapGrid bitmap={result.bitmap} />
              <FieldTable fields={result.fields} masked={mask} />
              {de55?.children && <TlvTree nodes={de55.children} />}
            </>
          )}
        </>
      )}

      <footer>
        Built from the public ISO 8583 and EMV specifications. All sample data is synthetic.
        <br />
        Parsing runs entirely in your browser — no message ever leaves this page.
      </footer>
    </div>
  );
}
