const express = require("express");
const router = express.Router();
const db = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");
const { makePicker, fail } = require("../utils/dbHelpers");
const { protect, authorize } = require("../middleware/auth");

const FIELDS = [
  "project_id",
  "assigned_to",
  "title",
  "description",
  "status",
  "priority",
  "due_date",
];
const VALID_STATUSES = ["PENDING", "IN_PROGRESS", "DONE", "CANCELLED"];
const VALID_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const pick = makePicker(FIELDS);

// Who can move a task where (managers/admins)
const TASK_TRANSITIONS = {
  PENDING: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["DONE", "PENDING", "CANCELLED"],
  DONE: ["IN_PROGRESS"], // reopen
  CANCELLED: ["PENDING"], // revive
};

// What a plain employee may do on their own task
const EMPLOYEE_TRANSITIONS = {
  PENDING: ["IN_PROGRESS"],
  IN_PROGRESS: ["DONE", "PENDING"],
};

// Returns an error message if dueDate falls outside the project's window, else null.
// Dates are 'YYYY-MM-DD' strings (pool uses dateStrings: true), so string compare is safe.
const checkDueDateInProject = async (projectId, dueDate) => {
  if (!dueDate) return null;
  const [rows] = await db.query(
    "SELECT start_date, end_date FROM projects WHERE id = ?",
    [projectId],
  );
  if (!rows.length) return null; // invalid project is reported by the FK error
  const { start_date, end_date } = rows[0];
  if (start_date && dueDate < start_date)
    return `due_date cannot be before the project start (${start_date})`;
  if (end_date && dueDate > end_date)
    return `due_date cannot be after the project end (${end_date})`;
  return null;
};

// ==========================================
// GET /tasks?search=&status=&priority=&project_id=&assigned_to=
// EMPLOYEE only ever sees their own tasks, whatever the URL says
// ==========================================
router.get(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    const { search, status, priority, project_id } = req.query;
    let { assigned_to } = req.query;

    if (req.user.role === "EMPLOYEE") {
      if (req.user.employee_id == null) return res.json([]);
      assigned_to = req.user.employee_id;
    }

    const conditions = [];
    const values = [];

    if (search) {
      conditions.push("(t.title LIKE ? OR t.description LIKE ?)");
      values.push(`%${search}%`, `%${search}%`);
    }
    if (status) {
      conditions.push("t.status = ?");
      values.push(status);
    }
    if (priority) {
      conditions.push("t.priority = ?");
      values.push(priority);
    }
    if (project_id) {
      conditions.push("t.project_id = ?");
      values.push(project_id);
    }
    if (assigned_to) {
      conditions.push("t.assigned_to = ?");
      values.push(assigned_to);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const [rows] = await db.query(
      `SELECT t.*, p.name AS project_name, e.name AS assigned_name
       FROM tasks t
       LEFT JOIN projects p ON p.id = t.project_id
       LEFT JOIN employees e ON e.id = t.assigned_to
       ${where}
       ORDER BY t.id`,
      values,
    );

    res.json(rows);
  }),
);

// ==========================================
// GET /tasks/overdue
// MUST stay above GET /:id, or "overdue" is treated as an id.
// ==========================================
router.get(
  "/overdue",
  protect,
  asyncHandler(async (req, res) => {
    const conditions = [
      "t.due_date IS NOT NULL",
      "t.due_date < CURDATE()",
      "t.status NOT IN ('DONE', 'CANCELLED')",
    ];
    const values = [];

    if (req.user.role === "EMPLOYEE") {
      if (req.user.employee_id == null) return res.json([]);
      conditions.push("t.assigned_to = ?");
      values.push(req.user.employee_id);
    }

    const [rows] = await db.query(
      `SELECT t.*, p.name AS project_name, e.name AS assigned_name
       FROM tasks t
       LEFT JOIN projects p ON p.id = t.project_id
       LEFT JOIN employees e ON e.id = t.assigned_to
       WHERE ${conditions.join(" AND ")}
       ORDER BY t.due_date ASC`,
      values,
    );

    res.json(rows);
  }),
);

// ==========================================
// GET /tasks/:id
// EMPLOYEE can only open a task assigned to them
// ==========================================
router.get(
  "/:id",
  protect,
  asyncHandler(async (req, res) => {
    const [rows] = await db.query(
      `SELECT t.*, p.name AS project_name, e.name AS assigned_name
       FROM tasks t
       LEFT JOIN projects p ON p.id = t.project_id
       LEFT JOIN employees e ON e.id = t.assigned_to
       WHERE t.id = ?`,
      [req.params.id],
    );
    if (!rows.length)
      return res.status(404).json({ message: "Task not found" });

    const task = rows[0];
    if (
      req.user.role === "EMPLOYEE" &&
      Number(task.assigned_to) !== Number(req.user.employee_id)
    )
      return res
        .status(403)
        .json({ message: "You can only view your own tasks" });

    res.json(task);
  }),
);

// ==========================================
// POST /tasks
// Only ADMIN/MANAGER can create tasks
// ==========================================
router.post(
  "/",
  protect,
  authorize("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const body = req.body || {};

    if (body.status) body.status = String(body.status).toUpperCase();
    if (body.priority) body.priority = String(body.priority).toUpperCase();

    if (!body.project_id || !body.title)
      return res
        .status(400)
        .json({ message: "project_id and title are required" });

    if (body.status && !VALID_STATUSES.includes(body.status))
      return res.status(400).json({
        message: `status must be one of: ${VALID_STATUSES.join(", ")}`,
      });

    // F: a new task cannot be born finished or cancelled
    if (body.status && !["PENDING", "IN_PROGRESS"].includes(body.status))
      return res.status(400).json({
        message: "A new task must start as PENDING or IN_PROGRESS",
      });

    if (body.priority && !VALID_PRIORITIES.includes(body.priority))
      return res.status(400).json({
        message: `priority must be one of: ${VALID_PRIORITIES.join(", ")}`,
      });

    // E: due date must sit inside the project's window
    const dateError = await checkDueDateInProject(
      body.project_id,
      body.due_date || null,
    );
    if (dateError) return res.status(400).json({ message: dateError });

    const fields = pick(body);
    const sql = `INSERT INTO tasks (${fields.map(([k]) => k).join(",")})
                 VALUES (${fields.map(() => "?").join(",")})`;
    try {
      const [result] = await db.query(
        sql,
        fields.map(([, v]) => v),
      );
      res.status(201).json({ message: "Task created", id: result.insertId });
    } catch (e) {
      fail(res, e);
    }
  }),
);

// ==========================================
// PUT /tasks/:id
// ADMIN/MANAGER can update any field on any task.
// EMPLOYEE can update ONLY "status", ONLY on their own task.
// ==========================================
router.put(
  "/:id",
  protect,
  asyncHandler(async (req, res) => {
    const body = req.body || {};
    if (body.status) body.status = String(body.status).toUpperCase();
    if (body.priority) body.priority = String(body.priority).toUpperCase();

    const [existing] = await db.query("SELECT * FROM tasks WHERE id = ?", [
      req.params.id,
    ]);
    if (!existing.length)
      return res.status(404).json({ message: "Task not found" });
    const task = existing[0];

    const isManagerOrAdmin = ["ADMIN", "MANAGER"].includes(req.user.role);
    const isOwner =
      req.user.employee_id != null &&
      Number(task.assigned_to) === Number(req.user.employee_id);

    if (!isManagerOrAdmin && !isOwner)
      return res
        .status(403)
        .json({ message: "You can only update your own tasks" });

    if (!isManagerOrAdmin) {
      const disallowed = Object.keys(body).filter((f) => f !== "status");
      if (disallowed.length)
        return res.status(403).json({
          message: `You are not allowed to change: ${disallowed.join(", ")}`,
        });
    }

    if (body.status && !VALID_STATUSES.includes(body.status))
      return res.status(400).json({
        message: `status must be one of: ${VALID_STATUSES.join(", ")}`,
      });

    if (body.priority && !VALID_PRIORITIES.includes(body.priority))
      return res.status(400).json({
        message: `priority must be one of: ${VALID_PRIORITIES.join(", ")}`,
      });

    // F: transition rules — only when the status is actually changing
    // (the edit form re-sends the current status, and that must still pass)
    if (body.status && body.status !== task.status) {
      const allowed = TASK_TRANSITIONS[task.status] || [];
      if (!allowed.includes(body.status))
        return res.status(400).json({
          message: `Cannot move a task from ${task.status} to ${body.status}`,
        });

      if (!isManagerOrAdmin) {
        const empAllowed = EMPLOYEE_TRANSITIONS[task.status] || [];
        if (!empAllowed.includes(body.status))
          return res.status(403).json({
            message: `Only a manager or admin can move a task from ${task.status} to ${body.status}`,
          });
      }

      if (body.status === "DONE") {
        const assignee =
          "assigned_to" in body ? body.assigned_to || null : task.assigned_to;
        if (!assignee)
          return res.status(400).json({
            message: "Assign the task to someone before marking it DONE",
          });
      }
    }

    // E: due date vs project window — only when the date or project actually changes,
    // so older tasks that predate this rule can still be edited (e.g. description)
    const newDue = "due_date" in body ? body.due_date || null : task.due_date;
    const newProject =
      "project_id" in body ? Number(body.project_id) : task.project_id;
    const dueChanged = "due_date" in body && newDue !== task.due_date;
    const projectChanged =
      "project_id" in body && newProject !== task.project_id;

    if (dueChanged || projectChanged) {
      const dateError = await checkDueDateInProject(newProject, newDue);
      if (dateError) return res.status(400).json({ message: dateError });
    }

    const fields = pick(body);
    if (!fields.length)
      return res.status(400).json({ message: "No valid fields to update" });

    const sql = `UPDATE tasks SET ${fields.map(([k]) => `${k}=?`).join(",")} WHERE id=?`;
    try {
      const [result] = await db.query(sql, [
        ...fields.map(([, v]) => v),
        req.params.id,
      ]);
      if (!result.affectedRows)
        return res.status(404).json({ message: "Task not found" });
      res.json({ message: "Task updated" });
    } catch (e) {
      fail(res, e);
    }
  }),
);

// ==========================================
// DELETE /tasks/:id
// Only ADMIN/MANAGER can delete tasks
// ==========================================
router.delete(
  "/:id",
  protect,
  authorize("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const [result] = await db.query("DELETE FROM tasks WHERE id = ?", [
      req.params.id,
    ]);
    if (!result.affectedRows)
      return res.status(404).json({ message: "Task not found" });
    res.json({ message: "Task deleted" });
  }),
);

module.exports = router;
