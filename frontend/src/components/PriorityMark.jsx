const LABEL = { 1: "Low", 2: "Medium", 3: "High" };

// Three small bars, filled up to the priority level, like a signal meter.
export default function PriorityMark({ level }) {
  return (
    <span className={`prio prio-${level}`} title={`${LABEL[level]} priority`}>
      {[1, 2, 3].map((n) => (
        <i key={n} className={n <= level ? "on" : ""} />
      ))}
      <span className="sr-only">{LABEL[level]} priority</span>
    </span>
  );
}
