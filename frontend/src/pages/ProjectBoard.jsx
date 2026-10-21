import { useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Projects, Tasks } from "../api/client";
import ProjectDialog from "../components/ProjectDialog";
import TaskCard from "../components/TaskCard";
import TaskDialog from "../components/TaskDialog";
import { COLUMNS } from "../lib/constants";
import { projectsChanged } from "../lib/projectsBus";
import { useAsync } from "../lib/useAsync";

const byPosition = (a, b) => a.position - b.position;

export default function ProjectBoard() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { data, error, loading, reload, setData } = useAsync(
    () => Promise.all([Projects.get(projectId), Tasks.list({ project: projectId })]),
    [projectId],
  );
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState(null); // {task} | {status} | "project"
  const [drag, setDrag] = useState(null); // {id, status, index}
  const [flash, setFlash] = useState("");
  const flashTimer = useRef(0);

  const project = data?.[0];
  const tasks = useMemo(() => data?.[1] ?? [], [data]);

  const columns = useMemo(() => {
    const q = query.trim().toLowerCase();
    const visible = q
      ? tasks.filter((t) => (t.title + " " + t.notes).toLowerCase().includes(q))
      : tasks;
    return Object.fromEntries(
      COLUMNS.map((c) => [c.id, visible.filter((t) => t.status === c.id).sort(byPosition)]),
    );
  }, [tasks, query]);

  if (loading && !data) return <div className="page-loading">Loading…</div>;
  if (error)
    return (
      <div className="page-error">
        {error.status === 404 ? "That project doesn’t exist (or isn’t yours)." : error.message}
      </div>
    );

  const setTasks = (fn) => setData(([p, ts]) => [p, fn(ts)]);
  const notify = (msg) => {
    setFlash(msg);
    window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(""), 2600);
  };

  // Optimistically place the task, then ask the server to do the same and refresh.
  async function moveTask(task, status, index) {
    setTasks((ts) => {
      const others = ts.filter((t) => t.id !== task.id);
      const column = others.filter((t) => t.status === status).sort(byPosition);
      column.splice(index, 0, { ...task, status });
      const placed = new Map(column.map((t, i) => [t.id, { ...t, position: i }]));
      return [...others.filter((t) => t.status !== status), ...placed.values()];
    });
    try {
      await Tasks.move(task.id, status, index);
      if (status !== task.status) projectsChanged();
      reload();
    } catch (err) {
      notify(`Couldn’t move that task: ${err.message}`);
      reload();
    }
  }

  const toggleDone = (task) =>
    task.status === "done"
      ? moveTask(task, "todo", 0)
      : moveTask(task, "done", columns.done.length);

  async function quickAdd(status, title) {
    const created = await Tasks.create({ project: project.id, title, status });
    setTasks((ts) => [...ts, created]);
    projectsChanged();
  }

  function onSaved(saved) {
    setDialog(null);
    setTasks((ts) => (ts.some((t) => t.id === saved.id) ? ts.map((t) => (t.id === saved.id ? saved : t)) : [...ts, saved]));
    projectsChanged();
    reload();
  }

  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "done").length;

  return (
    <div className="page page-board">
      <header className="board-head">
        <div>
          <div className="eyebrow">
            <span className={`swatch swatch-${project.color}`} aria-hidden /> Project
          </div>
          <h1>{project.name}</h1>
          {project.description && <p className="lede">{project.description}</p>}
        </div>
        <div className="board-tools">
          <div className="board-progress" aria-label={`${done} of ${total} done`}>
            <span className="mono-count">
              {done}/{total}
            </span>
            <span className="progress-track">
              <span
                key={project.id}
                className={`progress-fill fill-${project.color}`}
                style={{ width: `${total ? (done / total) * 100 : 0}%` }}
              />
            </span>
          </div>
          <input
            type="search"
            className="search"
            placeholder="Filter tasks"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Filter tasks"
          />
          <button className="btn-ghost" onClick={() => setDialog("project")}>
            Edit
          </button>
          <button className="btn" onClick={() => setDialog({ status: "todo" })}>
            New task
          </button>
        </div>
      </header>

      <div className="board">
        {COLUMNS.map((col) => (
          <Column
            key={col.id}
            column={col}
            tasks={columns[col.id]}
            drag={drag}
            setDrag={setDrag}
            onDropTask={(id, index) => {
              const task = tasks.find((t) => t.id === id);
              if (task) moveTask(task, col.id, index);
            }}
            onOpen={(task) => setDialog({ task })}
            onToggleDone={toggleDone}
            onQuickAdd={(title) => quickAdd(col.id, title)}
            filtering={Boolean(query)}
          />
        ))}
      </div>

      {flash && (
        <div className="flash" role="status">
          {flash}
        </div>
      )}

      {dialog === "project" && (
        <ProjectDialog
          project={project}
          onClose={() => setDialog(null)}
          onSaved={(p) => {
            setDialog(null);
            setData(([, ts]) => [p, ts]);
            projectsChanged();
          }}
          onDeleted={() => {
            projectsChanged();
            navigate("/");
          }}
        />
      )}
      {dialog && dialog !== "project" && (
        <TaskDialog
          task={dialog.task}
          projectId={project.id}
          defaultStatus={dialog.status}
          onClose={() => setDialog(null)}
          onSaved={onSaved}
          onDeleted={(task) => {
            setDialog(null);
            setTasks((ts) => ts.filter((t) => t.id !== task.id));
            projectsChanged();
          }}
        />
      )}
    </div>
  );
}

function Column({ column, tasks, drag, setDrag, onDropTask, onOpen, onToggleDone, onQuickAdd, filtering }) {
  const listRef = useRef(null);
  const [draft, setDraft] = useState("");
  const isTarget = drag?.status === column.id;

  // Work out which slot the pointer is over by comparing against card midpoints.
  function indexFromPointer(clientY) {
    const cards = [...listRef.current.querySelectorAll("[data-task-id]")].filter(
      (el) => Number(el.dataset.taskId) !== drag?.id,
    );
    const i = cards.findIndex((el) => {
      const r = el.getBoundingClientRect();
      return clientY < r.top + r.height / 2;
    });
    return i === -1 ? cards.length : i;
  }

  async function submitDraft(e) {
    e.preventDefault();
    const title = draft.trim();
    if (!title) return;
    setDraft("");
    await onQuickAdd(title);
  }

  const visible = tasks.filter((t) => t.id !== drag?.id || !isTarget);

  return (
    <section
      className={`column ${isTarget ? "is-target" : ""}`}
      aria-labelledby={`col-${column.id}`}
      onDragOver={(e) => {
        if (!drag || filtering) return;
        e.preventDefault();
        const index = indexFromPointer(e.clientY);
        if (drag.status !== column.id || drag.index !== index)
          setDrag({ ...drag, status: column.id, index });
      }}
      onDrop={(e) => {
        e.preventDefault();
        if (drag) onDropTask(drag.id, drag.index);
        setDrag(null);
      }}
    >
      <header className="column-head">
        <h2 id={`col-${column.id}`}>{column.label}</h2>
        <span className="mono-count">{tasks.length}</span>
      </header>

      <div className="column-list" ref={listRef}>
        {visible.map((task, i) => (
          <div key={task.id} data-task-id={task.id}>
            {isTarget && drag.index === i && <div className="drop-line" />}
            <TaskCard
              task={task}
              onOpen={onOpen}
              onToggleDone={onToggleDone}
              isDragging={drag?.id === task.id}
              dragProps={{
                draggable: !filtering,
                onDragStart: (e) => {
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", String(task.id));
                  setDrag({ id: task.id, status: null, index: null, from: column.id });
                },
                onDragEnd: () => setDrag(null),
              }}
            />
          </div>
        ))}
        {isTarget && drag.index === visible.length && <div className="drop-line" />}
        {tasks.length === 0 && !isTarget && (
          <p className="column-empty">{filtering ? "No matches." : "Nothing here."}</p>
        )}
      </div>

      {column.id !== "done" && !filtering && (
        <form className="quick-add" onSubmit={submitDraft}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="+ Add a task"
            aria-label={`Add a task to ${column.label}`}
            maxLength={160}
          />
        </form>
      )}
    </section>
  );
}
