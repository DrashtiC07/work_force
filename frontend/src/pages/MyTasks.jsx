import { useEffect, useState } from "react";
import { tasksApi } from "../services/api";
import Toast from "../components/Toast";
import MyStats from "../components/MyStats";
import { statusOptionsFor, statusLabel } from "../utils/taskTransitions";

function MyTasks({ user, onLogout }) {
  const [tasks, setTasks] = useState([]);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statsVersion, setStatsVersion] = useState(0);

  const showToast = (text, type) => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 2500);
  };

  const load = async () => {
    try {
      const params =
        user.employee_id != null ? { assigned_to: user.employee_id } : {};
      setTasks(await tasksApi.list(params));
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const changeStatus = async (taskId, newStatus) => {
    try {
      await tasksApi.update(taskId, { status: newStatus });
      showToast("Status updated", "ok");
      setStatsVersion((v) => v + 1); // refresh the stats strip too
    } catch (err) {
      showToast(err.message, "error");
    }
    load();
  };

  return (
    <div className="app">
      <Toast toast={toast} />

      <div className="topbar">
        <div>
          <h1>My Tasks</h1>
          <p>Tasks assigned to you across all projects.</p>
        </div>

        <div className="topbar-right">
          <span className="count">{tasks.length} tasks</span>
          <button className="btn-primary" onClick={onLogout}>
            Logout {user.name}
          </button>
        </div>
      </div>

      <MyStats refreshKey={statsVersion} />

      <div className="panel">
        {loading ? (
          <div className="empty">Loading…</div>
        ) : tasks.length === 0 ? (
          <div className="empty">No tasks assigned to you yet.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Project</th>
                  <th>Priority</th>
                  <th>Due</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => {
                  const options = statusOptionsFor(t.status, user.role);
                  const locked = options.length === 1;

                  return (
                    <tr key={t.id}>
                      <td>
                        <div className="person-name">{t.title}</div>
                        {t.description && (
                          <div className="person-email">{t.description}</div>
                        )}
                      </td>
                      <td className="muted">{t.project_name || "—"}</td>
                      <td>
                        <span className="pill">{t.priority}</span>
                      </td>
                      <td className="muted">{t.due_date || "—"}</td>
                      <td>
                        <select
                          value={t.status}
                          onChange={(e) => changeStatus(t.id, e.target.value)}
                          disabled={locked}
                          title={
                            locked ? "Ask a manager to change this status" : ""
                          }
                        >
                          {options.map((s) => (
                            <option key={s} value={s}>
                              {statusLabel(s)}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default MyTasks;
