const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth");
const db = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");
const { makePicker, fail } = require("../utils/dbHelpers");
const { sendInviteEmail } = require("../utils/mailer");
const FIELDS = [
  "name",
  "email",
  "department_id",
  "designation",
  "salary",
  "join_date",
  "invite_code",
];
const pick = makePicker(FIELDS);

const {
  validateEmployeeCreate,
  validateEmployeeUpdate,
} = require("../middleware/validateEmployee");

const generateInviteCode = () => {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
};

// ==========================================
// GET /employees?search=
// Get all employees / search employees
// ==========================================
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const search = `%${req.query.search || ""}%`;

    const [rows] = await db.query(
      `SELECT e.*, d.name AS department
       FROM employees e
       LEFT JOIN departments d ON d.id = e.department_id
       WHERE e.name LIKE ?
          OR e.email LIKE ?
          OR e.designation LIKE ?
       ORDER BY e.id`,
      [search, search, search],
    );

    res.json(rows);
  }),
);

// ==========================================
// GET /employees/:id
// Get one employee
// ==========================================
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const [rows] = await db.query(
      `SELECT e.*, d.name AS department
       FROM employees e
       LEFT JOIN departments d ON d.id = e.department_id
       WHERE e.id = ?`,
      [req.params.id],
    );

    if (!rows.length) {
      return res.status(404).json({
        message: "Employee not found",
      });
    }

    res.json(rows[0]);
  }),
);

// ==========================================
// POST /employees
// Create employee
// ==========================================
router.post(
  "/",
  protect,
  authorize("ADMIN"),
  validateEmployeeCreate,
  asyncHandler(async (req, res) => {
    req.body.invite_code = generateInviteCode();
    const fields = pick(req.body);

    const sql = `
      INSERT INTO employees (${fields.map(([k]) => k).join(",")})
      VALUES (${fields.map(() => "?").join(",")})
    `;

    try {
      const [result] = await db.query(
        sql,
        fields.map(([, v]) => v),
      );

      res.status(201).json({
        message: "Employee added",
        id: result.insertId,
        invite_code: req.body.invite_code,
      });
      await sendInviteEmail(
        req.body.email,
        req.body.name,
        req.body.invite_code,
      );
    } catch (e) {
      fail(res, e);
    }
  }),
);

// ==========================================
// PUT /employees/:id/regenerate-invite
// ADMIN only — rotates an employee's invite code, e.g. if it was
// lost or shared insecurely. Does NOT affect an already-linked
// user account, since linking happens once at signup and is never
// re-checked against invite_code afterwards.
// ==========================================
router.put(
  "/:id/regenerate-invite",
  protect,
  authorize("ADMIN"),
  asyncHandler(async (req, res) => {
    const newCode = generateInviteCode();

    try {
      // Need name + email to send the notification — fetch before updating
      const [existing] = await db.query(
        "SELECT name, email FROM employees WHERE id = ?",
        [req.params.id],
      );
      if (!existing.length) {
        return res.status(404).json({ message: "Employee not found" });
      }
      const { name, email } = existing[0];

      const [result] = await db.query(
        "UPDATE employees SET invite_code = ? WHERE id = ?",
        [newCode, req.params.id],
      );

      if (!result.affectedRows) {
        return res.status(404).json({ message: "Employee not found" });
      }

      res.json({
        message: "Invite code regenerated",
        invite_code: newCode,
      });

      // Fire after responding, wrapped so an email failure never blocks
      // the actual code update — same pattern as employee creation
      await sendInviteEmail(email, name, newCode);
    } catch (e) {
      fail(res, e);
    }
  }),
);

// ==========================================
// PUT /employees/:id
// Update employee
// ==========================================
router.put(
  "/:id",
  protect,
  authorize("ADMIN"),
  validateEmployeeUpdate,
  asyncHandler(async (req, res) => {
    const fields = pick(req.body);

    if (!fields.length) {
      return res.status(400).json({
        message: "No valid fields to update",
      });
    }

    const sql = `
      UPDATE employees
      SET ${fields.map(([k]) => `${k}=?`).join(",")}
      WHERE id=?
    `;

    try {
      const [result] = await db.query(sql, [
        ...fields.map(([, v]) => v),
        req.params.id,
      ]);

      if (!result.affectedRows) {
        return res.status(404).json({
          message: "Employee not found",
        });
      }

      res.json({
        message: "Employee updated.",
      });
    } catch (e) {
      fail(res, e);
    }
  }),
);

// ==========================================
// DELETE /employees/:id
// Delete employee
// ==========================================
router.delete(
  "/:id",
  protect,
  authorize("ADMIN"),
  asyncHandler(async (req, res) => {
    try {
      const [result] = await db.query("DELETE FROM employees WHERE id = ?", [
        req.params.id,
      ]);

      if (!result.affectedRows) {
        return res.status(404).json({
          message: "Employee not found",
        });
      }

      res.json({
        message: "Employee deleted",
      });
    } catch (e) {
      fail(res, e);
    }
  }),
);

module.exports = router;
