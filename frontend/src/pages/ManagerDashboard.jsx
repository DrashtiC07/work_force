import { useState } from "react";
import DashboardOverview from "./DashboardOverview";
import EmployeeDirectory from "./EmployeeDirectory";
import ProjectsPanel from "../components/ProjectsPanel";
import TasksPanel from "../components/TasksPanel";

function ManagerDashboard({ user, onLogout }) {
  const [tab, setTab] = useState("overview");
  const isAdmin = user.role === "ADMIN";

  return (
    <div className="app">
      <div className="topbar">
        <div>
          <h1>Workforce Platform</h1>
          <p>
            Manage projects, tasks
            {isAdmin ? ", employees, and overview" : " and overview"}.
          </p>
        </div>

        <div className="topbar-right">
          <button className="btn-primary" onClick={onLogout}>
            Logout {user.role}
          </button>
        </div>
      </div>

      <div className="tab-nav">
        <button
          className={tab === "overview" ? "tab-active" : ""}
          onClick={() => setTab("overview")}
        >
          Overview
        </button>

        <button
          className={tab === "projects" ? "tab-active" : ""}
          onClick={() => setTab("projects")}
        >
          Projects
        </button>

        <button
          className={tab === "tasks" ? "tab-active" : ""}
          onClick={() => setTab("tasks")}
        >
          Tasks
        </button>

        {isAdmin && (
          <button
            className={tab === "employees" ? "tab-active" : ""}
            onClick={() => setTab("employees")}
          >
            Employees
          </button>
        )}
      </div>

      {tab === "overview" && (
        <DashboardOverview isAdmin={isAdmin} onNavigate={setTab} />
      )}

      {tab === "projects" && <ProjectsPanel />}

      {tab === "tasks" && <TasksPanel />}

      {tab === "employees" && isAdmin && (
        <EmployeeDirectory user={user} onLogout={onLogout} embedded />
      )}
    </div>
  );
}

export default ManagerDashboard;
