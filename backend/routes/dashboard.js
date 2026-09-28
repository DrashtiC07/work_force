const express = require("express");
const router = express.Router();
const db = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");
const { protect, authorize } = require("../middleware/auth");

// mysql2 returns SUM(...) as a STRING (it is a DECIMAL), e.g. "3" not 3.
// numify() converts the listed columns into real numbers (NULL -> 0).
const numify = (row, keys) => {
  const out = { ...row };
  for (const k of keys) out[k] = Number(row[k]) || 0;
  return out;
};

// Reusable SQL conditions. They all assume the tasks table is aliased as `t`.
const ACTIVE = "t.status IN ('PENDING','IN_PROGRESS')";
const OVERDUE =
  "(t.due_date IS NOT NULL AND t.due_date < CURDATE() AND t.status NOT IN ('DONE','CANCELLED'))";

// ==========================================
// GET /dashboard/overview
// ADMIN + MANAGER. One call returns everything the Overview tab needs:
// totals, per-project progress, and per-employee workload.
// ==========================================
router.get(
  "/overview",
  protect,
  authorize("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const [projectTotalsRes, taskTotalsRes, progressRes, workloadRes] =
      await Promise.all([
        db.query(
          `SELECT COUNT(*) AS total,
                  SUM(status = 'PLANNED')   AS planned,
                  SUM(status = 'ACTIVE')    AS active,
                  SUM(status = 'ON_HOLD')   AS on_hold,
                  SUM(status = 'COMPLETED') AS completed
           FROM projects`,
        ),
        db.query(
          `SELECT COUNT(*) AS total,
                  SUM(t.status = 'PENDING')     AS pending,
                  SUM(t.status = 'IN_PROGRESS') AS in_progress,
                  SUM(t.status = 'DONE')        AS done,
                  SUM(t.status = 'CANCELLED')   AS cancelled,
                  SUM(${OVERDUE})               AS overdue,
                  SUM(t.assigned_to IS NULL AND ${ACTIVE}) AS unassigned_active
           FROM tasks t`,
        ),
        // LEFT JOIN so a project with zero tasks still appears (with zeros)
        db.query(
          `SELECT p.id, p.name, p.status, p.start_date, p.end_date,
                  COUNT(t.id)                   AS total_tasks,
                  SUM(t.status = 'DONE')        AS done,
                  SUM(t.status = 'IN_PROGRESS') AS in_progress,
                  SUM(t.status = 'PENDING')     AS pending,
                  SUM(t.status = 'CANCELLED')   AS cancelled,
                  SUM(${OVERDUE})               AS overdue
           FROM projects p
           LEFT JOIN tasks t ON t.project_id = p.id
           GROUP BY p.id, p.name, p.status, p.start_date, p.end_date
           ORDER BY p.id`,
        ),
        // LEFT JOIN so employees with no tasks still appear - that is idle capacity
        db.query(
          `SELECT e.id, e.name, e.designation,
                  SUM(${ACTIVE})                AS active,
                  SUM(t.status = 'DONE')        AS done,
                  SUM(${OVERDUE})               AS overdue,
                  SUM(${ACTIVE} AND t.priority IN ('HIGH','URGENT')) AS high_priority_active
           FROM employees e
           LEFT JOIN tasks t ON t.assigned_to = e.id
           GROUP BY e.id, e.name, e.designation
           ORDER BY active DESC, overdue DESC, e.name`,
        ),
      ]);

    const projects = numify(projectTotalsRes[0][0], [
      "total",
      "planned",
      "active",
      "on_hold",
      "completed",
    ]);

    const tasks = numify(taskTotalsRes[0][0], [
      "total",
      "pending",
      "in_progress",
      "done",
      "cancelled",
      "overdue",
      "unassigned_active",
    ]);

    // progress % = done / (all tasks - cancelled).
    // A cancelled task is not work that still has to happen, so counting it
    // would make a project look permanently unfinished.
    const project_progress = progressRes[0].map((row) => {
      const p = numify(row, [
        "total_tasks",
        "done",
        "in_progress",
        "pending",
        "cancelled",
        "overdue",
      ]);
      const counted = p.total_tasks - p.cancelled;
      p.progress = counted > 0 ? Math.round((p.done / counted) * 100) : 0;
      return p;
    });

    const employee_workload = workloadRes[0].map((row) =>
      numify(row, ["active", "done", "overdue", "high_priority_active"]),
    );

    res.json({ projects, tasks, project_progress, employee_workload });
  }),
);

// ==========================================
// GET /dashboard/my
// Any logged-in user. Only ever counts tasks assigned to THEM,
// taken from the token - never from a URL parameter.
// ==========================================
router.get(
  "/my",
  protect,
  asyncHandler(async (req, res) => {
    const employeeId = req.user.employee_id;

    // An ADMIN/MANAGER account that isn't linked to an employee row has no tasks
    if (employeeId == null)
      return res.json({
        linked: false,
        active: 0,
        done: 0,
        overdue: 0,
        high_priority_active: 0,
        due_soon: 0,
      });

    const [rows] = await db.query(
      `SELECT SUM(${ACTIVE})          AS active,
              SUM(t.status = 'DONE')  AS done,
              SUM(${OVERDUE})         AS overdue,
              SUM(${ACTIVE} AND t.priority IN ('HIGH','URGENT')) AS high_priority_active,
              SUM(${ACTIVE} AND t.due_date IS NOT NULL
                  AND t.due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)) AS due_soon
       FROM tasks t
       WHERE t.assigned_to = ?`,
      [employeeId],
    );

    res.json({
      linked: true,
      ...numify(rows[0], [
        "active",
        "done",
        "overdue",
        "high_priority_active",
        "due_soon",
      ]),
    });
  }),
);

module.exports = router;
