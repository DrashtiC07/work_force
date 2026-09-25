const express = require("express");
const router = express.Router();
const db = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");
const { makePicker, fail } = require("../utils/dbHelpers");

const FIELDS = ["name", "description", "status", "start_date", "end_date"];
const VALID_STATUSES = ["PLANNED", "ACTIVE", "ON_HOLD", "COMPLETED"];
const pick = makePicker(FIELDS);
const { protect, authorize } = require("../middleware/auth");

// ==========================================
// GET /projects?search=
// Get all projects / search projects
// ADMIN/MANAGER only — employees don't browse the project list directly,
// they see project_name via their assigned tasks instead.
// ==========================================
router.get(
  "/",
  protect,
  authorize("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const search = `%${req.query.search || ""}%`;
    const [rows] = await db.query(
      `SELECT * FROM projects WHERE name LIKE ? OR description LIKE ? ORDER BY id`,
      [search, search],
    );
    res.json(rows);
  }),
);

// ==========================================
// GET /projects/:id
// Get one project — ADMIN/MANAGER only
// ==========================================
router.get(
  "/:id",
  protect,
  authorize("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const [rows] = await db.query("SELECT * FROM projects WHERE id = ?", [
      req.params.id,
    ]);
    if (!rows.length)
      return res.status(404).json({ message: "Project not found" });
    res.json(rows[0]);
  }),
);

// ==========================================
// POST /projects
// Create project
// ==========================================
router.post(
  "/",
  protect,
  authorize("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const body = req.body || {};
    if (body.status) body.status = String(body.status).toUpperCase();
    if (!body.name)
      return res.status(400).json({ message: "name is required" });
    if (body.status && !VALID_STATUSES.includes(body.status))
      return res.status(400).json({
        message: `status must be one of: ${VALID_STATUSES.join(", ")}`,
      });

    const fields = pick(body);
    const sql = `INSERT INTO projects (${fields.map(([k]) => k).join(",")})
                 VALUES (${fields.map(() => "?").join(",")})`;
    try {
      const [result] = await db.query(
        sql,
        fields.map(([, v]) => v),
      );
      res.status(201).json({ message: "Project created", id: result.insertId });
    } catch (e) {
      fail(res, e);
    }
  }),
);

// ==========================================
// PUT /projects/:id
// Update project
// ==========================================
router.put(
  "/:id",
  protect,
  authorize("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const body = req.body || {};
    if (body.status) body.status = String(body.status).toUpperCase();
    if (body.status && !VALID_STATUSES.includes(body.status))
      return res.status(400).json({
        message: `status must be one of: ${VALID_STATUSES.join(", ")}`,
      });

    const fields = pick(body);
    if (!fields.length)
      return res.status(400).json({ message: "No valid fields to update" });

    const sql = `UPDATE projects SET ${fields.map(([k]) => `${k}=?`).join(",")} WHERE id=?`;
    try {
      const [result] = await db.query(sql, [
        ...fields.map(([, v]) => v),
        req.params.id,
      ]);
      if (!result.affectedRows)
        return res.status(404).json({ message: "Project not found" });
      res.json({ message: "Project updated" });
    } catch (e) {
      fail(res, e);
    }
  }),
);

// ==========================================
// DELETE /projects/:id
// Delete project
// ==========================================
router.delete(
  "/:id",
  protect,
  authorize("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const [result] = await db.query("DELETE FROM projects WHERE id = ?", [
      req.params.id,
    ]);
    if (!result.affectedRows)
      return res.status(404).json({ message: "Project not found" });
    res.json({ message: "Project deleted" });
  }),
);

module.exports = router;
