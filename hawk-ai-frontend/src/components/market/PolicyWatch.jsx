import Blueprint from '../ui/Blueprint';

/** Government and regulator updates that can move sectors long-term. */
export default function PolicyWatch({ items }) {
  return (
    <Blueprint className="policy-card">
      <h6 className="side-title">Policy watch</h6>
      {items.map((p) => (
        <div key={p.id} className="policy-item">
          <span className="kicker">{p.source}</span>
          <span className="policy-text">{p.text}</span>
        </div>
      ))}
    </Blueprint>
  );
}
