"use client";

import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";
import "./views.css";

type Task = {
  id: string;
  title: string;
  estimate?: number; // story points / hours
  status?: string;
  due_date?: string;
  priority?: string;
};

type Props = {
  sprintLength?: number; // in days (default: 10)
  tasks?: Task[];
  projectInfo?: {
    name?: string;
    sprint_length?: number;
    manager?: string;
  };
};

const TASK_STATUSES = ["Todo", "Sprint", "Review", "Completed"];

export default function BurndownView({
  sprintLength = 10,
  tasks = [],
  projectInfo,
}: Props) {
  const [estimateUnit, setEstimateUnit] = useState<"hours" | "points">("hours");

  // ==================== CALCULATIONS ====================

  // 1️⃣ TOTAL ESTIMATED WORK
  const totalEstimate = useMemo(() => {
    return tasks.reduce((sum, t) => sum + (t.estimate || 8), 0);
  }, [tasks]);

  // 2️⃣ COMPLETED WORK
  const completedEstimate = useMemo(() => {
    return tasks
      .filter((t) => t.status === "Completed")
      .reduce((sum, t) => sum + (t.estimate || 8), 0);
  }, [tasks]);

  // 3️⃣ REMAINING WORK
  const remainingEstimate = totalEstimate - completedEstimate;

  // 4️⃣ TASKS BREAKDOWN BY STATUS
  const tasksByStatus = useMemo(() => {
    const breakdown: Record<string, number> = {};
    TASK_STATUSES.forEach((status) => {
      breakdown[status] = tasks.filter((t) => t.status === status).length;
    });
    return breakdown;
  }, [tasks]);

  // 5️⃣ IDEAL LINE (linear burndown)
  const idealLine = useMemo(() => {
    const dailyBurn = totalEstimate / sprintLength;
    return Array.from({ length: sprintLength + 1 }).map((_, day) => ({
      day,
      ideal: Math.max(totalEstimate - dailyBurn * day, 0),
    }));
  }, [totalEstimate, sprintLength]);

  // 6️⃣ ACTUAL LINE (based on completed tasks)
  const actualLine = useMemo(() => {
    // Simulate progress based on completion ratio
    const completionRatio = totalEstimate > 0 ? completedEstimate / totalEstimate : 0;
    const simulatedDays = Math.round(completionRatio * sprintLength);

    return Array.from({ length: sprintLength + 1 }).map((_, day) => {
      const progressPercentage = day <= simulatedDays ? 1 : (day / sprintLength) * 0.3;
      return {
        day,
        actual: Math.max(totalEstimate - totalEstimate * progressPercentage, 0),
      };
    });
  }, [totalEstimate, completedEstimate, sprintLength]);

  // 7️⃣ MERGE DATA FOR CHART
  const chartData = idealLine.map((p, i) => ({
    day: `Day ${p.day}`,
    ideal: Math.round(p.ideal),
    actual: Math.round(actualLine[i].actual),
  }));

  // 8️⃣ BURNDOWN STATUS
  const status = useMemo(() => {
    if (completedEstimate === totalEstimate) {
      return { text: "✅ Complete", color: "#10b981" };
    } else if (
      actualLine[Math.min(idealLine.length - 1, 5)]?.actual <=
      idealLine[Math.min(idealLine.length - 1, 5)]?.ideal
    ) {
      return { text: "📈 On Track", color: "#4f46e5" };
    } else {
      return { text: "⚠️ At Risk", color: "#ef4444" };
    }
  }, [completedEstimate, totalEstimate, actualLine, idealLine]);

  return (
    <div className="burndown-wrapper">
      <div className="burndown-header">
        <div>
          <h2>Sprint Burndown Chart</h2>
          <p className="burndown-hint">Track remaining work across the sprint.</p>
        </div>
        <div className="burndown-status" style={{ borderColor: status.color }}>
          <span style={{ color: status.color }}>{status.text}</span>
        </div>
      </div>

      {/* PROJECT INFO */}
      <div className="burndown-info-cards">
        <div className="info-card">
          <div className="info-label">Total Work</div>
          <div className="info-value">
            {totalEstimate} <span className="info-unit">{estimateUnit === "hours" ? "hrs" : "pts"}</span>
          </div>
        </div>

        <div className="info-card">
          <div className="info-label">Completed</div>
          <div className="info-value">
            {completedEstimate} <span className="info-unit">{estimateUnit === "hours" ? "hrs" : "pts"}</span>
          </div>
        </div>

        <div className="info-card">
          <div className="info-label">Remaining</div>
          <div className="info-value">
            {remainingEstimate} <span className="info-unit">{estimateUnit === "hours" ? "hrs" : "pts"}</span>
          </div>
        </div>

        <div className="info-card">
          <div className="info-label">Progress</div>
          <div className="info-value">
            {totalEstimate > 0
              ? Math.round((completedEstimate / totalEstimate) * 100)
              : 0}
            <span className="info-unit">%</span>
          </div>
        </div>
      </div>

      {/* TASKS BREAKDOWN */}
      <div className="tasks-breakdown">
        <h3>Tasks by Status</h3>
        <div className="breakdown-grid">
          {TASK_STATUSES.map((status) => (
            <div key={status} className="breakdown-item">
              <div className="breakdown-label">{status}</div>
              <div className="breakdown-count">{tasksByStatus[status] || 0}</div>
            </div>
          ))}
        </div>
      </div>

      {/* BURNDOWN CHART */}
      <div className="burndown-chart-container">
        <h3>Burndown Progress</h3>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" />
            <XAxis dataKey="day" stroke="#6b7280" />
            <YAxis stroke="#6b7280" label={{ value: `${estimateUnit === "hours" ? "Hours" : "Points"}`, angle: -90, position: "insideLeft" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                padding: "12px",
              }}
              formatter={(value: any) => `${value} ${estimateUnit === "hours" ? "hrs" : "pts"}`}
            />
            <Legend wrapperStyle={{ paddingTop: "20px" }} />

            {/* Ideal Line */}
            <Line
              type="monotone"
              dataKey="ideal"
              stroke="#4f46e5"
              strokeWidth={2.5}
              dot={false}
              name="Ideal Progress"
              isAnimationActive={false}
            />

            {/* Actual Line */}
            <Line
              type="monotone"
              dataKey="actual"
              stroke="#10b981"
              strokeWidth={2.5}
              dot={false}
              name="Actual Progress"
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* DETAILED STATS */}
      <div className="burndown-stats">
        <div className="stats-section">
          <h3>Sprint Statistics</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">Sprint Length:</span>
              <span className="stat-value">{sprintLength} days</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Ideal Daily Burn:</span>
              <span className="stat-value">
                {Math.round(totalEstimate / sprintLength)} {estimateUnit === "hours" ? "hrs" : "pts"}/day
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Total Tasks:</span>
              <span className="stat-value">{tasks.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Completed Tasks:</span>
              <span className="stat-value">
                {tasks.filter((t) => t.status === "Completed").length}/{tasks.length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
