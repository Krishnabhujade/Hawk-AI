import Segmented from '../ui/Segmented';
import { ErrorBox, Loading } from '../ui/Status';
import LadderView from './LadderView';
import VerdictView from './VerdictView';

const VIEWS = [
  { value: 'verdict', label: 'Verdict' },
  { value: 'ladder', label: 'Ladder' },
];

/** Right column: "Hawk AI says" — the call in simple or detailed form, plus the order ticket. */
export default function CallPanel({ predictionQuery, levels, view, onView, horizonLabel, children }) {
  const { data: prediction, error, loading, reload } = predictionQuery;

  return (
    <aside className="call-panel" aria-label="Hawk AI call">
      <div className="call-head">
        <h6>Hawk AI says</h6>
        <Segmented label="Call view" options={VIEWS} value={view} onChange={onView} />
      </div>

      <div className="call-body">
        {prediction && levels ? (
          view === 'ladder' ? (
            <LadderView prediction={prediction} horizonLabel={horizonLabel} />
          ) : (
            <VerdictView prediction={prediction} levels={levels} horizonLabel={horizonLabel} />
          )
        ) : error ? (
          <ErrorBox error={error} onRetry={reload} />
        ) : (
          <Loading lines={6} label={loading ? 'Reading the market…' : 'No call yet'} />
        )}
      </div>

      <div className="call-foot">{children}</div>
    </aside>
  );
}
