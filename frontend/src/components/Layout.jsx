import { useCallback, useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Projects } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { onProjectsChanged, projectsChanged } from "../lib/projectsBus";
import ProjectDialog from "./ProjectDialog";

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [projects, setProjects] = useState([]);
  const [creating, setCreating] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const load = useCallback(() => Projects.list().then(setProjects).catch(() => {}), []);
  useEffect(() => {
    load();
    return onProjectsChanged(load);
  }, [load]);

  // close the mobile menu after navigating
  useEffect(() => setMenuOpen(false), [location.pathname]);

  return (
    <div className="shell">
      <header className="topbar">
        <Wordmark />
        <button
          className="btn-ghost"
          aria-expanded={menuOpen}
          aria-controls="sidebar"
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? "Close" : "Index"}
        </button>
      </header>

      <aside id="sidebar" className={`sidebar ${menuOpen ? "is-open" : ""}`}>
        <Wordmark />

        <nav className="index" aria-label="Projects">
          <NavLink to="/" end className="index-link index-home">
            <span className="index-num">§</span>
            <span>Overview</span>
          </NavLink>

          <div className="index-heading">
            <span>Projects</span>
            <button className="link-btn" onClick={() => setCreating(true)}>
              + New
            </button>
          </div>

          {projects.length === 0 && <p className="index-empty">No projects yet.</p>}
          <ol className="index-list">
            {projects.map((p, i) => (
              <li key={p.id}>
                <NavLink to={`/projects/${p.id}`} className="index-link">
                  <span className="index-num">{String(i + 1).padStart(2, "0")}</span>
                  <span className="index-name">{p.name}</span>
                  <span className={`swatch swatch-${p.color}`} aria-hidden />
                  <span className="index-count" title={`${p.task_count - p.done_count} open`}>
                    {p.task_count - p.done_count}
                  </span>
                </NavLink>
              </li>
            ))}
          </ol>
        </nav>

        <footer className="sidebar-foot">
          <div>
            <div className="foot-name">{user?.first_name || user?.username}</div>
            <div className="foot-meta">@{user?.username}</div>
          </div>
          <button className="link-btn" onClick={logout}>
            Sign out
          </button>
        </footer>
      </aside>

      <main className="main">
        <Outlet />
      </main>

      {creating && (
        <ProjectDialog
          onClose={() => setCreating(false)}
          onSaved={(project) => {
            setCreating(false);
            projectsChanged();
            navigate(`/projects/${project.id}`);
          }}
        />
      )}
    </div>
  );
}

function Wordmark() {
  return (
    <NavLink to="/" className="wordmark" aria-label="Margin, home">
      <span className="wordmark-rule" aria-hidden />
      Margin
    </NavLink>
  );
}
