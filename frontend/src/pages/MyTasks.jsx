import { useEffect, useState } from "react";
import { tasksApi } from "../services/api";
import Toast from "../components/Toast";

const STATUS_OPTIONS = ["PENDING", "IN_PROGRESS", "DONE", "CANCELLED"];

const statusColor = {
  PENDING: "muted",
  IN_PROGRESS: "pill-active",
  DONE: "pill-done",
  CANCELLED: "pill-cancelled",
};

function MyTasks({ user, onLogout }) {
  const [tasks, setTasks] = useState([]);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);

  const showToast = (text, type) => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 2500);
  };

  const load = async () => {
      try {
         console.log("MY TASKS USER:", user);
         console.log("EMPLOYEE ID:", user.employee_id);
      const data = await tasksApi.list({ assigned_to: user.employee_id });
          setTasks(data);
          console.log("MY TASKS DATA:", data);
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
      load();
    } catch (err) {
      showToast(err.message, "error");
    }
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
                {tasks.map((t) => (
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
                        className={statusColor[t.status] || ""}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s.replace("_", " ")}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default MyTasks;
