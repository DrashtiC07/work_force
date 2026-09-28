import { useState } from "react";
import Auth from "./pages/Auth";
import MyTasks from "./pages/MyTasks";
import ManagerDashboard from "./pages/ManagerDashboard";
import { authApi } from "./services/api";
import "./index.css";

function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });

  const handleLogin = (userData) => setUser(userData);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (e) {
      // even if the network call fails, still clear local state below
    }
    localStorage.removeItem("user");
    setUser(null);
  };

  if (!user) return <Auth onLogin={handleLogin} />;

  if (user.role === "EMPLOYEE")
    return <MyTasks user={user} onLogout={handleLogout} />;
  return <ManagerDashboard user={user} onLogout={handleLogout} />;
}

export default App;
