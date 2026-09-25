const jwt = require("jsonwebtoken");

// Confirms the request carries a valid token
const protect = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer "))
    return res.status(401).json({ message: "No token provided" });

  const token = header.split(" ")[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, role, name } — set at login time
    next();
  } catch (e) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

// Confirms req.user's role is one of the allowed roles
// Usage: authorize("ADMIN") or authorize("ADMIN", "MANAGER")
const authorize =
  (...allowedRoles) =>
  (req, res, next) => {
    if (!req.user)
      return res.status(401).json({ message: "Not authenticated" });
    if (!allowedRoles.includes(req.user.role))
      return res
        .status(403)
        .json({ message: "You do not have permission for this action" });
    next();
  };

module.exports = { protect, authorize };
