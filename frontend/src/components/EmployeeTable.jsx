const initials = (name) =>
  name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

function EmployeeTable({
  employees,
  search,
  onSearchChange,
  onEdit,
  onDelete,
  onRegenerateInvite,
}) {
  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
  };

  return (
    <div className="panel">
      <div className="table-head">
        <h2>All employees</h2>
        <input
          className="search"
          placeholder="Search name, email, or role"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {employees.length === 0 ? (
        <div className="empty">No employees match your search.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Designation</th>
                <th className="num">Salary</th>
                <th>Joined</th>
                <th>Invite Code</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id}>
                  <td>
                    <div className="person">
                      <div className="avatar">{initials(emp.name)}</div>
                      <div>
                        <div className="person-name">{emp.name}</div>
                        <div className="person-email">{emp.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    {emp.department ? (
                      <span className="pill">{emp.department}</span>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>{emp.designation || <span className="muted">—</span>}</td>
                  <td className="num">
                    {emp.salary ? (
                      Number(emp.salary).toLocaleString("en-IN")
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td className="muted">{emp.join_date || "—"}</td>
                  <td>
                    {emp.invite_code ? (
                      <div className="invite-cell">
                        <code
                          className="invite-code"
                          title="Click to copy"
                          onClick={() => copyCode(emp.invite_code)}
                        >
                          {emp.invite_code}
                        </code>
                        <button
                          className="btn-regenerate"
                          title="Generate a new invite code for this employee"
                          onClick={() => onRegenerateInvite(emp.id)}
                        >
                          Regenerate
                        </button>
                      </div>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>
                    <div className="actions">
                      <button
                        className="btn-sm btn-edit"
                        onClick={() => onEdit(emp)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn-sm btn-edit"
                        onClick={() => onDelete(emp.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default EmployeeTable;
