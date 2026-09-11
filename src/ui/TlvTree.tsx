import type { TlvNode } from '../core/types';

function Row({ node, depth }: { node: TlvNode; depth: number }) {
  return (
    <>
      <div className="tlv-row" style={{ paddingLeft: depth * 18 }}>
        <div>
          <span className="tlv-tag">{node.tag}</span>
          <div style={{ color: 'var(--muted)', fontSize: 11 }}>{node.length} byte{node.length === 1 ? '' : 's'}</div>
        </div>
        <div>
          <div className="tlv-name">
            {node.name}
            {node.constructed && <span className="pill">constructed</span>}
          </div>
          {!node.constructed && <div className="tlv-value">{node.value || '(empty)'}</div>}
          {node.interpretation && <div className="tlv-interp">{node.interpretation}</div>}
        </div>
      </div>
      {node.children?.map((child, i) => <Row key={`${child.tag}-${i}`} node={child} depth={depth + 1} />)}
    </>
  );
}

export function TlvTree({ nodes }: { nodes: TlvNode[] }) {
  if (!nodes.length) return null;
  return (
    <section className="panel">
      <h2>DE 55 — EMV chip data</h2>
      <p className="hint">
        BER-TLV. The cryptogram (9F26) is what the issuer verifies; the TVR (95) is the terminal's
        list of what did and did not check out.
      </p>
      <div className="tlv">
        {nodes.map((n, i) => (
          <Row key={`${n.tag}-${i}`} node={n} depth={0} />
        ))}
      </div>
    </section>
  );
}
