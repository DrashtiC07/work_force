import { useEffect, useState } from "react";
import { dashboardApi } from "../services/api";
import Toast from "../components/Toast";

// Small horizontal bar
function Bar({ percent, label }) {
  return (
    <div className="progress">
      <div className="progress-track" aria-hidden="true">
        <div className="progress-fill" style={{ width: `${percent}%` }} />
      </div>
      <span className="progress-label">{label}</span>
    </div>
  );
}

function DashboardOverview({ isAdmin = false, onNavigate = () => {} }) {
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (text, type) => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 2500);
  };

  const load = () => {
    setFailed(false);
    dashboardApi
      .overview()
      .then(setData)
      .catch((err) => {
        setFailed(true);
        showToast(err.message, "error");
      });
  };

  useEffect(() => {
    load();
  }, []);

  if (!data) {
    return (
      <>
        <Toast toast={toast} />
        <div className="panel">
          {failed ? (
            <div
              className="panel-footer"
              style={{ border: 0, margin: 0, padding: 0 }}
            >
              <span className="muted">Could not load the overview.</span>
              <button className="btn-ghost btn-sm" type="button" onClick={load}>
                Retry
              </button>
            </div>
          ) : (
            <p className="muted">Loading overview…</p>
          )}
        </div>
      </>
    );
  }

  const { projects, tasks, project_progress, employee_workload } = data;

  const maxActive = Math.max(1, ...employee_workload.map((e) => e.active));

  const stats = [
    { label: "Total projects", value: projects.total },
    { label: "Active projects", value: projects.active },
    { label: "In progress", value: tasks.in_progress },
    { label: "Pending", value: tasks.pending },
    { label: "Completed", value: tasks.done },
    { label: "Overdue", value: tasks.overdue, warn: tasks.overdue > 0 },
    {
      label: "Unassigned",
      value: tasks.unassigned_active,
      warn: tasks.unassigned_active > 0,
    },
  ];

  return (
    <>
      <Toast toast={toast} />

      {/* ================= OVERVIEW ================= */}
      <div className="panel overview-panel">
        <div className="panel-header">
          <div>
            <h2>Overview</h2>
            <p className="panel-subtitle">
              A quick look at your workforce activity.
            </p>
          </div>
        </div>

        <div className="stats-grid">
          {stats.map((s) => (
            <div
              className={`stat-card ${s.warn ? "stat-warn" : ""}`}
              key={s.label}
            >
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ================= PROJECT PROGRESS ================= */}
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2>Project progress</h2>
            <p className="panel-subtitle">
              Track completion across all projects.
            </p>
          </div>
          <span className="count">{project_progress.length} projects</span>
        </div>

        {project_progress.length === 0 ? (
          <div className="empty">No projects yet.</div>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Status</th>
                    <th>Progress</th>
                    <th>Tasks done</th>
                    <th>Overdue</th>
                    <th>Deadline</th>
                  </tr>
                </thead>
                <tbody>
                  {project_progress.map((p) => {
                    const counted = p.total_tasks - p.cancelled;
                    return (
                      <tr key={p.id}>
                        <td className="person-name">{p.name}</td>
                        <td>
                          <span className="pill">
                            {p.status.replace("_", " ")}
                          </span>
                        </td>
                        <td>
                          <Bar percent={p.progress} label={`${p.progress}%`} />
                        </td>
                        <td className="muted">
                          {counted > 0 ? `${p.done} / ${counted}` : "No tasks"}
                        </td>
                        <td className={p.overdue > 0 ? "text-danger" : "muted"}>
                          {p.overdue || "—"}
                        </td>
                        <td className="muted">{p.end_date || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="panel-footer">
              <span className="muted">
                Showing all {project_progress.length} projects
              </span>
              <button
                className="btn-ghost btn-sm"
                type="button"
                onClick={() => onNavigate("projects")}
              >
                View Projects →
              </button>
            </div>
          </>
        )}
      </div>

      {/* ================= TEAM WORKLOAD ================= */}
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2>Team workload</h2>
            <p className="panel-subtitle">
              See how active work is distributed across the team.
            </p>
          </div>
          <span className="count">{employee_workload.length} people</span>
        </div>

        {employee_workload.length === 0 ? (
          <div className="empty">No employees yet.</div>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Team member</th>
                    <th>Open tasks</th>
                    <th>High priority</th>
                    <th>Overdue</th>
                    <th>Done</th>
                  </tr>
                </thead>
                <tbody>
                  {employee_workload.map((e) => (
                    <tr key={e.id}>
                      <td>
                        <div className="person-name">{e.name}</div>
                        <div className="person-email">
                          {e.designation || "—"}
                        </div>
                      </td>
                      <td>
                        {e.active > 0 ? (
                          <Bar
                            percent={(e.active / maxActive) * 100}
                            label={e.active}
                          />
                        ) : (
                          <span className="muted">Available</span>
                        )}
                      </td>
                      <td className="muted">{e.high_priority_active || "—"}</td>
                      <td className={e.overdue > 0 ? "text-danger" : "muted"}>
                        {e.overdue || "—"}
                      </td>
                      <td className="muted">{e.done || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="panel-footer">
              <span className="muted">
                {employee_workload.length} team members
              </span>
              {isAdmin && (
                <button
                  className="btn-ghost btn-sm"
                  type="button"
                  onClick={() => onNavigate("employees")}
                >
                  View Employees →
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default DashboardOverview;
