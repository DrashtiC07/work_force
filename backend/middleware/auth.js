const jwt = require("jsonwebtoken");

const protect = (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

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
