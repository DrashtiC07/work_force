function EmployeeForm({
  form,
  departments,
  editId,
  onChange,
  onSubmit,
  onCancel,
}) {
  return (
    <form onSubmit={onSubmit} className={`panel ${editId ? "editing" : ""}`}>
      <h2>{editId ? "Edit employee" : "Add employee"}</h2>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="name">Name</label>
          <input
            id="name"
            name="name"
            placeholder="Rahul Shah"
            value={form.name}
            onChange={onChange}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="rahul@co.com"
            value={form.email}
            onChange={onChange}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="department_id">Department</label>
          <select
            id="department_id"
            name="department_id"
            value={form.department_id}
            onChange={onChange}
          >
            <option value="">Select department</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="designation">Designation</label>
          <input
            id="designation"
            name="designation"
            placeholder="Software Engineer"
            value={form.designation}
            onChange={onChange}
          />
        </div>
        <div className="field">
          <label htmlFor="salary">Salary</label>
          <input
            id="salary"
            name="salary"
            type="number"
            placeholder="65000"
            value={form.salary}
            onChange={onChange}
          />
        </div>
        <div className="field">
          <label htmlFor="join_date">Join date</label>
          <input
            id="join_date"
            name="join_date"
            type="date"
            value={form.join_date}
            onChange={onChange}
          />
        </div>
      </div>
      <div className="form-actions">
        <button type="submit" className="btn-primary">
          {editId ? "Save changes" : "Add employee"}
        </button>
        {editId && (
          <button type="button" className="btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export default EmployeeForm;
