const STEPS = [
  { n: 1, title: 'Watch', hint: 'the live chart' },
  { n: 2, title: 'Read the call', hint: 'Hawk AI does the analysis' },
  { n: 3, title: 'Act', hint: 'one tap to your broker' },
];

/** The "1 Watch · 2 Read the call · 3 Act" strip under the header. */
export default function StepsBar() {
  return (
    <ol className="steps-bar">
      {STEPS.map((s) => (
        <li key={s.n} className="step">
          <span className="step-num">{s.n}</span>
          <span className="step-title">{s.title}</span>
          <span className="step-hint">{s.hint}</span>
        </li>
      ))}
    </ol>
  );
}
