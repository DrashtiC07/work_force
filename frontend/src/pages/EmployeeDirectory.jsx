import { useEffect, useState } from "react";
import { employeesApi, departmentsApi } from "../services/api";
import Toast from "../components/Toast";
import EmployeeForm from "../components/EmployeeForm";
import EmployeeTable from "../components/EmployeeTable";

const empty = {
  name: "",
  email: "",
  department_id: "",
  designation: "",
  salary: "",
  join_date: "",
};

function EmployeeDirectory({ user, onLogout, embedded = false }) {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);

  const showToast = (text, type) => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 2500);
  };

  const loadEmployees = async () => {
    try {
      setEmployees(await employeesApi.list(search));
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  useEffect(() => {
    departmentsApi
      .list()
      .then(setDepartments)
      .catch((err) => showToast(err.message, "error"));
  }, []);

  useEffect(() => {
    loadEmployees();
  }, [search]);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    try {
      const data = editId
        ? await employeesApi.update(editId, form)
        : await employeesApi.create(form);
      showToast(data.message, "ok");
      setForm(empty);
      setEditId(null);
      loadEmployees();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const edit = (emp) => {
    setEditId(emp.id);
    setForm({
      name: emp.name,
      email: emp.email,
      department_id: emp.department_id ?? "",
      designation: emp.designation ?? "",
      salary: emp.salary ?? "",
      join_date: emp.join_date ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditId(null);
    setForm(empty);
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this employee?")) return;
    try {
      const data = await employeesApi.remove(id);
      showToast(data.message, "ok");
    } catch (err) {
      showToast(err.message, "error");
    }
    loadEmployees();
  };

  const regenerateInvite = async (id) => {
    if (
      !window.confirm(
        "Generate a new invite code for this employee? The old code will stop working.",
      )
    )
      return;
    try {
      const data = await employeesApi.regenerateInvite(id);
      showToast(`New invite code: ${data.invite_code}`, "ok");
      loadEmployees();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  return (
    <div className={embedded ? "" : "app"}>
      <Toast toast={toast} />

      <div className="topbar">
        <div>
          <h1>Employee Directory</h1>
          <p>Add, search, and manage employee records.</p>
        </div>
        <div className="topbar-right">
          <span className="count">{employees.length} employees</span>
          {!embedded && (
            <button className="btn-primary" onClick={onLogout}>
              Logout {user.role}
            </button>
          )}
        </div>
      </div>

      <EmployeeForm
        form={form}
        departments={departments}
        editId={editId}
        onChange={change}
        onSubmit={save}
        onCancel={cancelEdit}
      />

      <EmployeeTable
        employees={employees}
        search={search}
        onSearchChange={setSearch}
        onEdit={edit}
        onDelete={remove}
        onRegenerateInvite={regenerateInvite}
      />
    </div>
  );
}

export default EmployeeDirectory;
