// Mirrors the status rules in backend/routes/tasks.js.
// If you change the rules there, change them here too.
const MANAGER_TRANSITIONS = {
  PENDING: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["DONE", "PENDING", "CANCELLED"],
  DONE: ["IN_PROGRESS"],
  CANCELLED: ["PENDING"],
};

const EMPLOYEE_TRANSITIONS = {
  PENDING: ["IN_PROGRESS"],
  IN_PROGRESS: ["DONE", "PENDING"],
};

// Current status first, then whatever this role may move it to
export const statusOptionsFor = (current, role) => {
  const map = role === "EMPLOYEE" ? EMPLOYEE_TRANSITIONS : MANAGER_TRANSITIONS;
  return [current, ...(map[current] || [])];
};

export const statusLabel = (s) => s.replace("_", " ");
