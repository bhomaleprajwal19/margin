import DueStamp from "./DueStamp";
import PriorityMark from "./PriorityMark";

export default function TaskCard({ task, onOpen, onToggleDone, dragProps, isDragging }) {
  const done = task.status === "done";
  return (
    <article
      className={`card ${done ? "is-done" : ""} ${isDragging ? "is-dragging" : ""}`}
      {...dragProps}
    >
      <button
        className={`check ${done ? "is-checked" : ""}`}
        onClick={() => onToggleDone(task)}
        aria-label={done ? `Reopen “${task.title}”` : `Mark “${task.title}” done`}
      />
      <button className="card-main" onClick={() => onOpen(task)}>
        <span className="card-title">{task.title}</span>
        {task.notes && <span className="card-notes">{task.notes}</span>}
        <span className="card-meta">
          <PriorityMark level={task.priority} />
          {!done && <DueStamp date={task.due_date} />}
        </span>
      </button>
    </article>
  );
}
