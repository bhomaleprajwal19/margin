import { Link } from "react-router-dom";
import { getDashboard, Projects } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import DueStamp from "../components/DueStamp";
import PriorityMark from "../components/PriorityMark";
import Sparkline from "../components/Sparkline";
import { longToday } from "../lib/dates";
import { useAsync } from "../lib/useAsync";

export default function Dashboard() {
  const { user } = useAuth();
  const { data, error, loading } = useAsync(
    () => Promise.all([getDashboard(), Projects.list()]),
    [],
  );

  if (loading && !data) return <div className="page-loading">Loading…</div>;
  if (error) return <div className="page-error">Couldn’t load your overview. {error.message}</div>;

  const [dash, projects] = data;
  const { counts, upcoming, activity } = dash;
  const doneTotal = activity.reduce((n, d) => n + d.done, 0);

  return (
    <div className="page">
      <header className="page-head">
        <div className="eyebrow">Overview · {user.first_name || user.username}</div>
        <h1>{longToday()}</h1>
        <p className="lede">{summaryLine(counts)}</p>
      </header>

      <section className="tally" aria-label="Summary">
        <Tally n={counts.open} label="open" />
        <Tally n={counts.doing} label="in progress" />
        <Tally n={counts.overdue} label="overdue" tone={counts.overdue ? "alert" : ""} />
        <Tally n={counts.done_this_week} label="done this week" />
      </section>

      <div className="split">
        <section className="panel">
          <h2 className="panel-title">
            Due this week <span className="mono-count">{upcoming.length}</span>
          </h2>
          {upcoming.length === 0 ? (
            <p className="empty-line">Nothing due in the next 7 days.</p>
          ) : (
            <ol className="ledger">
              {upcoming.map((t) => (
                <li key={t.id}>
                  <Link to={`/projects/${t.project}`} className="ledger-row">
                    <DueStamp date={t.due_date} />
                    <span className="ledger-title">{t.title}</span>
                    <span className="ledger-project">
                      <span className={`swatch swatch-${t.project_color}`} aria-hidden />
                      {t.project_name}
                    </span>
                    <PriorityMark level={t.priority} />
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>

        <aside className="panel">
          <h2 className="panel-title">
            Last two weeks <span className="mono-count">{doneTotal} done</span>
          </h2>
          <Sparkline data={activity} />

          <h2 className="panel-title panel-title-gap">Projects</h2>
          {projects.length === 0 ? (
            <p className="empty-line">
              No projects yet. Start one with “+ New” in the index.
            </p>
          ) : (
            <ul className="progress-list">
              {projects.map((p) => {
                const pct = p.task_count ? Math.round((p.done_count / p.task_count) * 100) : 0;
                return (
                  <li key={p.id}>
                    <Link to={`/projects/${p.id}`}>
                      <span className="progress-name">
                        <span className={`swatch swatch-${p.color}`} aria-hidden />
                        {p.name}
                      </span>
                      <span className="mono-count">
                        {p.done_count}/{p.task_count}
                      </span>
                      <span className="progress-track" aria-hidden>
                        <span className={`progress-fill fill-${p.color}`} style={{ width: `${pct}%` }} />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}

function Tally({ n, label, tone = "" }) {
  return (
    <div className={`tally-item ${tone}`}>
      <span className="tally-n">{n}</span>
      <span className="tally-label">{label}</span>
    </div>
  );
}

function summaryLine({ open, overdue, doing }) {
  if (open === 0) return "No open tasks. Create a project to get started.";
  const parts = [`${open} open task${open === 1 ? "" : "s"}`];
  if (doing) parts.push(`${doing} underway`);
  const base = parts.join(", ");
  return overdue
    ? `${base}, ${overdue} overdue.`
    : `${base}, nothing overdue.`;
}
