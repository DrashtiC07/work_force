import { useEffect, useState } from "react";
import { tasksApi, projectsApi, employeesApi } from "../services/api";
import Toast from "./Toast";

const STATUSES = ["PENDING", "IN_PROGRESS", "DONE", "CANCELLED"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];

const empty = {
  project_id: "",
  assigned_to: "",
  title: "",
  description: "",
  status: "PENDING",
  priority: "MEDIUM",
  due_date: "",
};

function TasksPanel() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [toast, setToast] = useState(null);

  // Task filters
  const [filters, setFilters] = useState({
    project_id: "",
    assigned_to: "",
    status: "",
    priority: "",
  });

  const showToast = (text, type) => {
    setToast({ text, type });

    setTimeout(() => {
      setToast(null);
    }, 2500);
  };

  // Load tasks with filters
  const load = (currentFilters = filters) => {
    const params = {};

    if (currentFilters.project_id) {
      params.project_id = currentFilters.project_id;
    }

    if (currentFilters.assigned_to) {
      params.assigned_to = currentFilters.assigned_to;
    }

    if (currentFilters.status) {
      params.status = currentFilters.status;
    }

    if (currentFilters.priority) {
      params.priority = currentFilters.priority;
    }

    tasksApi
      .list(params)
      .then(setTasks)
      .catch((e) => showToast(e.message, "error"));
  };

  useEffect(() => {
    load();

    projectsApi
      .list()
      .then(setProjects)
      .catch((e) => showToast(e.message, "error"));

    employeesApi
      .list()
      .then(setEmployees)
      .catch((e) => showToast(e.message, "error"));
  }, []);

  const change = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  // Filter change
  const changeFilter = (e) => {
    const updatedFilters = {
      ...filters,
      [e.target.name]: e.target.value,
    };

    setFilters(updatedFilters);
    load(updatedFilters);
  };

  // Clear all filters
  const clearFilters = () => {
    const clearedFilters = {
      project_id: "",
      assigned_to: "",
      status: "",
      priority: "",
    };

    setFilters(clearedFilters);
    load(clearedFilters);
  };

  const save = async (e) => {
    e.preventDefault();

    try {
      if (editId) {
        await tasksApi.update(editId, form);
        showToast("Task updated", "ok");
      } else {
        await tasksApi.create(form);
        showToast("Task created", "ok");
      }

      setForm(empty);
      setEditId(null);
      load();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const edit = (task) => {
    setEditId(task.id);

    setForm({
      project_id: task.project_id ?? "",
      assigned_to: task.assigned_to ?? "",
      title: task.title ?? "",
      description: task.description ?? "",
      status: task.status ?? "PENDING",
      priority: task.priority ?? "MEDIUM",
      due_date: task.due_date ? String(task.due_date).slice(0, 10) : "",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const cancelEdit = () => {
    setEditId(null);
    setForm(empty);
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this task?")) {
      return;
    }

    try {
      await tasksApi.remove(id);

      showToast("Task deleted", "ok");

      load();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  return (
    <>
      <Toast toast={toast} />

      {/* CREATE / EDIT TASK FORM */}
      <form onSubmit={save} className={`panel ${editId ? "editing" : ""}`}>
        <h2>{editId ? "Edit task" : "New task"}</h2>

        <div className="form-grid">
          {/* PROJECT */}
          <div className="field">
            <label>Project</label>

            <select
              name="project_id"
              value={form.project_id}
              onChange={change}
              required
            >
              <option value="">Select project</option>

              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          {/* ASSIGNED EMPLOYEE */}
          <div className="field">
            <label>Assign to</label>

            <select
              name="assigned_to"
              value={form.assigned_to}
              onChange={change}
            >
              <option value="">Unassigned</option>

              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
          </div>

          {/* TITLE */}
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label>Title</label>

            <input name="title" value={form.title} onChange={change} required />
          </div>

          {/* DESCRIPTION */}
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label>Description</label>

            <textarea
              name="description"
              value={form.description}
              onChange={change}
              placeholder="Optional details about the task"
              rows={3}
            />
          </div>

          {/* PRIORITY */}
          <div className="field">
            <label>Priority</label>

            <select name="priority" value={form.priority} onChange={change}>
              {PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </div>

          {/* STATUS — ONLY SHOWN WHILE EDITING */}
          {editId && (
            <div className="field">
              <label>Status</label>

              <select name="status" value={form.status} onChange={change}>
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* DUE DATE */}
          <div className="field">
            <label>Due date</label>

            <input
              type="date"
              name="due_date"
              value={form.due_date}
              onChange={change}
            />
          </div>
        </div>

        {/* FORM BUTTONS */}
        <div className="form-actions">
          <button type="submit" className="btn-primary">
            {editId ? "Save changes" : "Create task"}
          </button>

          {editId && (
            <button type="button" className="btn-ghost" onClick={cancelEdit}>
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* TASK LIST */}
      <div className="panel">
        {/* TASK HEADER */}
        <div className="panel-header">
          <h2>All tasks</h2>

          <span className="count">{tasks.length} tasks</span>
        </div>

        {/* FILTERS */}
        <div className="form-grid">
          {/* PROJECT FILTER */}
          <div className="field">
            <label>Project</label>

            <select
              name="project_id"
              value={filters.project_id}
              onChange={changeFilter}
            >
              <option value="">All projects</option>

              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          {/* EMPLOYEE FILTER */}
          <div className="field">
            <label>Employee</label>

            <select
              name="assigned_to"
              value={filters.assigned_to}
              onChange={changeFilter}
            >
              <option value="">All employees</option>

              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
          </div>

          {/* STATUS FILTER */}
          <div className="field">
            <label>Status</label>

            <select
              name="status"
              value={filters.status}
              onChange={changeFilter}
            >
              <option value="">All statuses</option>

              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>

          {/* PRIORITY FILTER */}
          <div className="field">
            <label>Priority</label>

            <select
              name="priority"
              value={filters.priority}
              onChange={changeFilter}
            >
              <option value="">All priorities</option>

              {PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* CLEAR FILTERS */}
        <div className="form-actions">
          <button type="button" className="btn-ghost" onClick={clearFilters}>
            Clear filters
          </button>
        </div>

        {/* TASK TABLE */}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Task</th>
                <th>Project</th>
                <th>Assigned</th>
                <th>Priority</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {tasks.map((task) => (
                <tr key={task.id}>
                  {/* TASK */}
                  <td className="person-name">{task.title}</td>

                  {/* PROJECT */}
                  <td className="muted">{task.project_name || "—"}</td>

                  {/* ASSIGNED */}
                  <td className="muted">
                    {task.assigned_name || "Unassigned"}
                  </td>

                  {/* PRIORITY */}
                  <td>
                    <span className="pill">{task.priority}</span>
                  </td>

                  {/* STATUS */}
                  <td>
                    <span className="pill">
                      {task.status.replace("_", " ")}
                    </span>
                  </td>

                  {/* ACTIONS */}
                  <td>
                    <div className="actions">
                      <button
                        type="button"
                        className="btn-sm btn-edit"
                        onClick={() => edit(task)}
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        className="btn-sm btn-edit"
                        onClick={() => remove(task.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {tasks.length === 0 && (
                <tr>
                  <td colSpan="6" className="empty">
                    No tasks found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export default TasksPanel;
