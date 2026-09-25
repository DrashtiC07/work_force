const makePicker = (fields) => (body) =>
  Object.entries(body)
    .filter(([k]) => fields.includes(k))
    .map(([k, v]) => [k, v === "" ? null : v]);

const fail = (res, e) => {
  if (e.code === "ER_DUP_ENTRY")
    return res.status(409).json({ message: "Duplicate entry" });
  if (e.code === "ER_NO_REFERENCED_ROW_2")
    return res.status(400).json({ message: "Invalid reference (foreign key)" });
  console.error(e);
  res.status(500).json({ message: "Server error" });
};

module.exports = { makePicker, fail };
