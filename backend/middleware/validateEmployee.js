const validateEmployeeCreate = (req, res, next) => {
  const { name, email } = req.body || {};

  if (!name || !email)
    return res.status(400).json({ message: "name and email required" });

  if (!/^\S+@\S+\.\S+$/.test(email))
    return res.status(400).json({ message: "Invalid email format" });

  next();
};

const validateEmployeeUpdate = (req, res, next) => {
  const body = req.body || {};

  for (const k of ["name", "email"]) {
    if (k in body && String(body[k] ?? "").trim() === "")
      return res.status(400).json({ message: `${k} cannot be empty` });
  }

  if (body.email && !/^\S+@\S+\.\S+$/.test(body.email))
    return res.status(400).json({ message: "Invalid email format" });

  next();
};

module.exports = { validateEmployeeCreate, validateEmployeeUpdate };
