"use client";

import { useEffect, useState } from "react";
import { Task } from "./BoardView";
import Modal from "./Modal";

export default function ListView({
  onTaskSelect,
  tasks = [],
  projectId,
  columns = ["Todo", "Sprint", "Review", "Completed"],
}: {
  onTaskSelect: (task: Task) => void;
  tasks?: Task[];
  projectId?: string;
  columns?: string[];
}) {
  const [currentColumns, setCurrentColumns] = useState<string[]>(columns);
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [columnName, setColumnName] = useState("");
  const [columnPosition, setColumnPosition] = useState<number | undefined>();

  const addColumn = async () => {
    if (!columnName.trim() || !projectId) return;

    try {
      const res = await fetch(`/api/projects/${projectId}/columns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          columnName: columnName.trim(),
          position: columnPosition,
        }),
      });

      if (!res.ok) throw new Error("Failed to add column");

      const data = await res.json();
      setCurrentColumns(data.columns);
      console.log("✅ Column added:", columnName);

      setColumnName("");
      setColumnPosition(undefined);
      setShowColumnModal(false);
    } catch (err) {
      console.error("❌ Failed to add column:", err);
    }
  };

  // sync when parent provides updated columns
  useEffect(() => {
    setCurrentColumns(columns);
  }, [columns]);

  return (
    <>
      <div className="list-wrapper">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3>List View</h3>
          {projectId && (
            <button className="btn-secondary" onClick={() => setShowColumnModal(true)}>
              + New column
            </button>
          )}
        </div>

        <table className="list-table">
          <thead>
            <tr>
              <th>Task Name</th>
              <th>Column</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {tasks.length === 0 && (
              <tr>
                <td colSpan={3} className="empty-state">
                  No tasks yet
                </td>
              </tr>
            )}

            {(tasks || []).map((t) => (
              <tr key={t.id}>
                <td>{t.title}</td>
                <td>{t.status}</td>
                <td>
                  <button className="view-btn" onClick={() => onTaskSelect(t)}>
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showColumnModal && (
        <Modal title="Add new column" onClose={() => setShowColumnModal(false)}>
          <div style={{ display: "grid", gap: 10 }}>
            <label>
              <div style={{ fontSize: 13, color: "#374151", marginBottom: 6 }}>Column name</div>
              <input
                placeholder="e.g., Ready, In Progress, Testing..."
                value={columnName}
                onChange={(e) => setColumnName(e.target.value)}
                autoFocus
              />
            </label>

            <label>
              <div style={{ fontSize: 13, color: "#374151", marginBottom: 6 }}>Position (optional)</div>
              <select
                value={columnPosition ?? ""}
                onChange={(e) => setColumnPosition(e.target.value ? parseInt(e.target.value) : undefined)}
              >
                <option value="">Add to end</option>
                {currentColumns.map((_, idx) => (
                  <option key={idx} value={idx}>
                    Before {currentColumns[idx]}
                  </option>
                ))}
              </select>
            </label>

            <button className="primary-btn" onClick={addColumn}>
              Add column
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
