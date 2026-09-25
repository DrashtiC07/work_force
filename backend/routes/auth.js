const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");
const { fail } = require("../utils/dbHelpers");
const { protect } = require("../middleware/auth");

const VALID_ROLES = ["ADMIN", "MANAGER", "EMPLOYEE"];

// ==========================================
// POST /auth/signup
// ==========================================
router.post(
  "/signup",
  asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body || {};

    if (!name || !email || !password)
      return res
        .status(400)
        .json({ message: "name, email, and password are required" });

    if (password.length < 6)
      return res
        .status(400)
        .json({ message: "password must be at least 6 characters" });

    const cleanRole = role ? String(role).toUpperCase() : "EMPLOYEE";
    if (!VALID_ROLES.includes(cleanRole))
      return res
        .status(400)
        .json({ message: `role must be one of: ${VALID_ROLES.join(", ")}` });

    const [empRows] = await db.query(
      "SELECT id FROM employees WHERE email = ?",
      [email],
    );
    const linkedEmployeeId = empRows.length ? empRows[0].id : null;

    const password_hash = await bcrypt.hash(password, 10);

    try {
      const [result] = await db.query(
        `INSERT INTO users (name, email, password_hash, role, employee_id) VALUES (?, ?, ?, ?, ?)`,
        [name, email, password_hash, cleanRole, linkedEmployeeId],
      );
      res.status(201).json({
        message: linkedEmployeeId
          ? "Account created and linked to existing employee record"
          : "Account created",
        id: result.insertId,
        employee_id: linkedEmployeeId,
      });
    } catch (e) {
      fail(res, e);
    }
  }),
);

// ==========================================
// POST /auth/login
// ==========================================
router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password)
      return res
        .status(400)
        .json({ message: "email and password are required" });

    const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    if (!rows.length)
      return res.status(401).json({ message: "Invalid email or password" });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match)
      return res.status(401).json({ message: "Invalid email or password" });

    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        role: user.role,
        employee_id: user.employee_id,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "8h" },
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        employee_id: user.employee_id,
      },
    });
  }),
);

// ==========================================
// GET /auth/me
// ==========================================
router.get("/me", protect, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
