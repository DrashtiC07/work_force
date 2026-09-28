const crypto = require("crypto");

const generateCsrfToken = () => crypto.randomBytes(32).toString("hex");

const SAFE_METHODS = ["GET", "HEAD", "OPTIONS"];

const csrfProtection = (req, res, next) => {
  if (SAFE_METHODS.includes(req.method)) return next();

  // login/signup are exempt — no session exists yet to protect
  if (req.path === "/auth/login" || req.path === "/auth/signup") return next();

  const cookieToken = req.cookies?.csrfToken;
  const headerToken = req.headers["x-csrf-token"];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ message: "Invalid or missing CSRF token" });
  }

  next();
};

module.exports = { generateCsrfToken, csrfProtection };
