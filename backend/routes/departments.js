const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { fail } = require("../utils/dbHelpers");

router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM departments ORDER BY name");
    res.json(rows);
  } catch (e) {
    fail(res, e);
  }
});

module.exports = router;
