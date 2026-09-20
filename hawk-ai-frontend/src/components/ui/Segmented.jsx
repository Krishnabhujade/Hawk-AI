/**
 * Segmented control (button group). `options` is a list of
 * { value, label } or plain strings.
 */
export default function Segmented({ options, value, onChange, label, className = '' }) {
  return (
    <div className={`seg ${className}`.trim()} role="group" aria-label={label}>
      {options.map((opt) => {
        const item = typeof opt === 'string' ? { value: opt, label: opt } : opt;
        return (
          <button
            key={item.value}
            type="button"
            className="seg-opt"
            aria-pressed={item.value === value}
            onClick={() => onChange(item.value)}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
