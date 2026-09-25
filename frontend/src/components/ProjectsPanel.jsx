import { useEffect, useState } from "react";
import { projectsApi } from "../services/api";
import Toast from "./Toast";

const STATUSES = ["PLANNED", "ACTIVE", "ON_HOLD", "COMPLETED"];
const empty = {
  name: "",
  description: "",
  status: "PLANNED",
  start_date: "",
  end_date: "",
};

function ProjectsPanel() {
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (text, type) => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 2500);
  };

  const load = () =>
    projectsApi
      .list()
      .then(setProjects)
      .catch((e) => showToast(e.message, "error"));
  useEffect(() => {
    load();
  }, []);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    try {
      editId
        ? await projectsApi.update(editId, form)
        : await projectsApi.create(form);
      showToast(editId ? "Project updated" : "Project created", "ok");
      setForm(empty);
      setEditId(null);
      load();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const edit = (p) =>
    setForm({
      ...p,
      description: p.description || "",
      start_date: p.start_date || "",
      end_date: p.end_date || "",
    }) || setEditId(p.id);

  const remove = async (id) => {
    if (!window.confirm("Delete this project? Its tasks will also be removed."))
      return;
    try {
      await projectsApi.remove(id);
      showToast("Project deleted", "ok");
      load();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  return (
    <>
      <Toast toast={toast} />
      <form onSubmit={save} className={`panel ${editId ? "editing" : ""}`}>
        <h2>{editId ? "Edit project" : "New project"}</h2>
        <div className="form-grid">
          <div className="field">
            <label>Name</label>
            <input name="name" value={form.name} onChange={change} required />
          </div>
          <div className="field">
            <label>Status</label>
            <select name="status" value={form.status} onChange={change}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Start date</label>
            <input
              type="date"
              name="start_date"
              value={form.start_date}
              onChange={change}
            />
          </div>
          <div className="field">
            <label>End date</label>
            <input
              type="date"
              name="end_date"
              value={form.end_date}
              onChange={change}
            />
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label>Description</label>
            <input
              name="description"
              value={form.description}
              onChange={change}
            />
          </div>
        </div>
        <div className="form-actions">
          <button type="submit" className="btn-primary">
            {editId ? "Save changes" : "Create project"}
          </button>
          {editId && (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setEditId(null);
                setForm(empty);
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="panel">
        <div className="panel-header">
          <h2>All projects</h2>
          <span className="count">{projects.length} projects</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Start</th>
                <th>End</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id}>
                  <td className="person-name">{p.name}</td>
                  <td>
                    <span className="pill">{p.status}</span>
                  </td>
                  <td className="muted">{p.start_date || "—"}</td>
                  <td className="muted">{p.end_date || "—"}</td>
                  <td>
                    <div className="actions">
                      <button
                        className="btn-sm btn-edit"
                        onClick={() => edit(p)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn-sm btn-edit"
                        onClick={() => remove(p.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export default ProjectsPanel;
