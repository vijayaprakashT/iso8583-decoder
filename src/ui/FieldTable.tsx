import type { ParsedField } from '../core/types';

function interpClass(field: ParsedField): string {
  if (field.de !== 39 || !field.interpretation) return 'interp';
  return field.interpretation.includes('✓') ? 'interp good' : 'interp bad';
}

export function FieldTable({ fields, masked }: { fields: ParsedField[]; masked: boolean }) {
  return (
    <section className="panel">
      <h2>Data elements</h2>
      <p className="hint">Read in bitmap order — the order they appear on the wire.</p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>DE</th>
              <th>Field</th>
              <th>Len</th>
              <th>Value</th>
              <th>Meaning</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((f) => (
              <tr key={f.de}>
                <td className="de">{f.de}</td>
                <td>
                  <div className="name-main">{f.name}</div>
                  {f.spec.description && <div className="name-desc">{f.spec.description}</div>}
                </td>
                <td className="len">
                  {f.lengthPrefix ? `${f.spec.lengthType} ${f.lengthPrefix}` : `fixed ${f.spec.length}`}
                  <div style={{ fontSize: 11, opacity: 0.75 }}>{f.spec.content}</div>
                </td>
                <td className="value">
                  {f.display || <span style={{ opacity: 0.5 }}>(empty)</span>}
                  {masked && f.spec.sensitive && <span className="pill masked">masked</span>}
                </td>
                <td className={interpClass(f)}>{f.interpretation ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
