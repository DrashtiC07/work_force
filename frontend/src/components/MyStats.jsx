import { useEffect, useState } from "react";
import { dashboardApi } from "../services/api";

function MyStats({ refreshKey = 0 }) {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  const loadStats = async () => {
    try {
      setError("");

      const data = await dashboardApi.my();

      setStats(data);
    } catch (err) {
      setError(err.message || "Could not load your stats");
    }
  };

  useEffect(() => {
    loadStats();
  }, [refreshKey]);

  if (error) {
    return <div className="my-stats-note">Could not load your task stats.</div>;
  }

  if (!stats) {
    return <div className="my-stats-note">Loading your stats…</div>;
  }

  if (!stats.linked) {
    return (
      <div className="my-stats-note">
        Your account isn't linked to an employee record yet.
      </div>
    );
  }

  const cards = [
    {
      label: "Active",
      value: stats.active,
    },
    {
      label: "Done",
      value: stats.done,
    },
    {
      label: "Overdue",
      value: stats.overdue,
      alert: stats.overdue > 0,
    },
    {
      label: "High Priority",
      value: stats.high_priority_active,
      alert: stats.high_priority_active > 0,
    },
    {
      label: "Due Soon",
      value: stats.due_soon,
      alert: stats.due_soon > 0,
    },
  ];

  return (
    <div className="my-stats">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`my-stat ${card.alert ? "is-alert" : ""}`}
        >
          <div className="my-stat-value">{card.value}</div>
          <div className="my-stat-label">{card.label}</div>
        </div>
      ))}
    </div>
  );
}

export default MyStats;
