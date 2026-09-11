import { getSpec } from '../core/fields';
import type { BitmapInfo } from '../core/types';

/**
 * The bitmap, one cell per bit. Bit 1 is the secondary-bitmap indicator
 * rather than a data element, so it gets its own colour — that distinction
 * is the thing people most often get wrong when reading a message by hand.
 */
export function BitmapGrid({ bitmap }: { bitmap: BitmapInfo }) {
  return (
    <section className="panel">
      <h2>Bitmap</h2>
      <p className="hint">
        Each bit says whether the matching data element is present. Bit 1 is not a field — it flags
        that a secondary bitmap follows, covering DE 65–128.
      </p>

      <div className="bitmap-hex">
        Primary <b>{bitmap.primaryHex}</b>
        {bitmap.secondaryHex ? (
          <>
            {' · '}Secondary <b>{bitmap.secondaryHex}</b>
          </>
        ) : (
          ' · no secondary bitmap'
        )}
      </div>

      <div className="bitgrid">
        {bitmap.bits.map((set, i) => {
          const de = i + 1;
          const indicator = de === 1;
          const spec = getSpec(de);
          const title = indicator
            ? 'Bit 1 — secondary bitmap indicator'
            : `DE ${de} — ${spec?.name ?? 'unassigned'}${set ? '' : ' (not present)'}`;
          return (
            <div
              key={de}
              className={`bit ${set ? (indicator ? 'indicator' : 'set') : ''}`}
              title={title}
            >
              {de}
            </div>
          );
        })}
      </div>

      <div className="bitgrid-legend">
        <span>
          <i className="swatch" style={{ background: 'var(--accent)' }} />
          Field present
        </span>
        <span>
          <i className="swatch" style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent)' }} />
          Secondary bitmap indicator
        </span>
        <span>
          <i className="swatch" style={{ background: 'var(--panel-2)', border: '1px solid var(--border)' }} />
          Absent
        </span>
      </div>
    </section>
  );
}
