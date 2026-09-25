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

// ==========================================
// GET /tasks?search=&status=&priority=&project_id=&assigned_to=
// List tasks, with optional filters
// ==========================================
router.get(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    const { search, status, priority, project_id, assigned_to } = req.query;

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
// Tasks whose due_date has passed and are not DONE/CANCELLED.
// MUST be registered before GET /:id — otherwise Express treats
// "overdue" as an :id value and this route is never reached.
// ==========================================
router.get(
  "/overdue",
  protect,
  asyncHandler(async (req, res) => {
    const [rows] = await db.query(
      `SELECT t.*, p.name AS project_name, e.name AS assigned_name
       FROM tasks t
       LEFT JOIN projects p ON p.id = t.project_id
       LEFT JOIN employees e ON e.id = t.assigned_to
       WHERE t.due_date IS NOT NULL
         AND t.due_date < CURDATE()
         AND t.status NOT IN ('DONE', 'CANCELLED')
       ORDER BY t.due_date ASC`,
    );

    res.json(rows);
  }),
);

// ==========================================
// GET /tasks/:id
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
    res.json(rows[0]);
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

    if (body.priority && !VALID_PRIORITIES.includes(body.priority))
      return res.status(400).json({
        message: `priority must be one of: ${VALID_PRIORITIES.join(", ")}`,
      });

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
// EMPLOYEE can update ONLY the "status" field, and ONLY on a task
// assigned to them (req.user.employee_id must match task.assigned_to).
// ==========================================
router.put(
  "/:id",
  protect,
  asyncHandler(async (req, res) => {
    const body = req.body || {};
    if (body.status) body.status = String(body.status).toUpperCase();
    if (body.priority) body.priority = String(body.priority).toUpperCase();

    // Load the task first — needed to check ownership before allowing the update
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

    // A plain employee (not manager/admin) may only ever change "status"
    if (!isManagerOrAdmin) {
      const attemptedFields = Object.keys(body);
      const disallowed = attemptedFields.filter((f) => f !== "status");
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
