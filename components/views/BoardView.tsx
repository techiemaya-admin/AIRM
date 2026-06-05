"use client";

import { useState, useEffect } from "react";
import "./views.css";
import Modal from "./Modal";

import {
  DndContext,
  DragEndEvent,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";

import { Eye, GripVertical, Plus, X } from "lucide-react";

/* ================= TYPES ================= */

export type Task = {
  id: string;
  title: string;
  status: string;
  priority?: string;
  assignee?: string;
  labels?: string[];
  due_date?: string;
};

type BoardViewProps = {
  onTaskSelect: (task: Task) => void;
  tasks: Task[];
  setTasks: (t: Task[] | ((prev: Task[]) => Task[])) => void;
  projectId: string;
  columns?: string[];
};

/* ================= DRAGGABLE TASK ================= */

function DraggableTask({
  task,
  onView,
}: {
  task: Task;
  onView: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: task.id,
  });

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  const initials = task.assignee
    ? task.assignee
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "U";

  return (
    <div ref={setNodeRef} style={style} className="task-card">
      <span className="drag-handle" {...attributes} {...listeners}>
        <GripVertical size={14} />
      </span>

      <div className="task-content">
        <div className="task-row">
          <strong className="task-title">{task.title}</strong>

          <div className="task-badges">
            {task.priority && (
              <span className={`badge priority ${task.priority}`}>
                {task.priority}
              </span>
            )}

            {Array.isArray((task as any).labels) && (task as any).labels.slice(0,3).map((l: string) => (
              <span key={l} className="badge label">
                {l}
              </span>
            ))}
          </div>
        </div>

        <div className="task-row meta-row">
          <div className="assignee">
            <div className="avatar">{initials}</div>
            <div className="assignee-name">{task.assignee || "Unassigned"}</div>
          </div>

          <div className="task-meta">
            {task.due_date ? `Due ${task.due_date.slice(0,10)}` : "No due date"}
          </div>
        </div>
      </div>

      <button className="view-btn" onClick={onView}>
        <Eye size={14} />
        View
      </button>
    </div>
  );
}

/* ================= DROPPABLE COLUMN ================= */

function DroppableColumn({
  column,
  tasks,
  onViewTask,
}: {
  column: string;
  tasks: Task[];
  onViewTask: (task: Task) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column,
  });

  return (
    <div
      ref={setNodeRef}
      className="board-column"
      style={{ background: isOver ? "#eef2ff" : undefined }}
    >
      <div className="column-header">
        <span>
          {column} ({tasks.length})
        </span>
      </div>

      {tasks.map((task) => (
        <DraggableTask
          key={task.id}
          task={task}
          onView={() => onViewTask(task)}
        />
      ))}
    </div>
  );
}

/* ================= MAIN BOARD ================= */

export default function BoardView({ onTaskSelect, tasks, setTasks, projectId, columns = ["Todo", "Sprint", "Review", "Completed"] }: BoardViewProps) {
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [columnName, setColumnName] = useState("");
  const [columnPosition, setColumnPosition] = useState<number | undefined>();
  const [currentColumns, setCurrentColumns] = useState<string[]>(columns);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskStatus, setTaskStatus] = useState(currentColumns[0]);
  const [taskPriority, setTaskPriority] = useState<string>("low");
  const [taskAssigneeId, setTaskAssigneeId] = useState<string | null>(null);
  const [taskDueDate, setTaskDueDate] = useState<string | null>(null);
  const [taskEstimate, setTaskEstimate] = useState<number | undefined>(undefined);
  const [taskLabelsInput, setTaskLabelsInput] = useState<string>("");
  const [members, setMembers] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!projectId) return;

    fetch(`/api/projects/${projectId}/members`)
      .then((res) => res.json())
      .then(setMembers)
      .catch((err) => console.error("Failed to load members", err));
  }, [projectId]);

  /* ================= UPDATE TASK STATUS WHEN COLUMNS CHANGE ================= */
  useEffect(() => {
    setTaskStatus(currentColumns[0]);
  }, [currentColumns]);

  // keep internal columns in sync when parent prop changes
  useEffect(() => {
    setCurrentColumns(columns);
  }, [columns]);

  /* ================= ADD COLUMN ================= */
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

  /* ================= REMOVE COLUMN ================= */
  const removeColumn = async (colName: string) => {
    if (!projectId || currentColumns.length <= 1) return;

    try {
      const res = await fetch(`/api/projects/${projectId}/columns`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columnName: colName }),
      });

      if (!res.ok) throw new Error("Failed to remove column");

      const data = await res.json();
      setCurrentColumns(data.columns);
      console.log("✅ Column removed:", colName);
    } catch (err) {
      console.error("❌ Failed to remove column:", err);
    }
  };

  /* ================= CREATE TASK ================= */

  const addTask = async () => {
    if (!taskTitle.trim() || !projectId) return;

    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: taskTitle,
          description: taskDescription,
          status: taskStatus,
          priority: taskPriority,
          estimate: taskEstimate ?? undefined,
          assignee_id: taskAssigneeId,
          due_date: taskDueDate,
          labels: taskLabelsInput
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      });

      if (!res.ok) throw new Error("Create failed");

      const newTask = await res.json();
      console.log("🟢 Created task:", newTask);

      setTasks((prev) => (Array.isArray(prev) ? [...prev, newTask] : [...prev as any, newTask]));
      setTaskTitle("");
      setTaskDescription("");
      setTaskPriority("low");
      setTaskAssigneeId(null);
      setTaskDueDate(null);
      setTaskEstimate(undefined);
      setTaskLabelsInput("");
      setShowTaskModal(false);
    } catch (err) {
      console.error("❌ Failed to create task:", err);
    }
  };

  /* ================= DRAG UPDATE ================= */

  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !projectId) return; // Skip for preview

    const newStatus = over.id as string;
    const taskId = active.id as string;

    console.log("🟡 Drag update:", taskId, newStatus);

    // Optimistic UI update
    setTasks((prev) =>
      (Array.isArray(prev) ? prev : prev as Task[]).map((t) =>
        t.id === taskId ? { ...t, status: newStatus } : t
      )
    );

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error("Update failed");

      console.log("✅ Task updated in DB");
    } catch (err) {
      console.error("❌ Update task error:", err);
    }
  };

  /* ================= RENDER ================= */

  return (
    <>
      <div className="board-wrapper">
        <div className="board-header">
          <h3>Kanban board</h3>
          <span className="board-hint">
            Drag & drop tasks between columns.
          </span>
        </div>

        <div className="board-actions">
          {projectId && (
            <>
              <button className="btn-primary" onClick={() => setShowTaskModal(true)}>
                + New task
              </button>
              <button className="btn-secondary" onClick={() => setShowColumnModal(true)}>
                + New column
              </button>
            </>
          )}
        </div>

        <DndContext onDragEnd={onDragEnd}>
          <div className="board-columns">
            {currentColumns.map((col) => (
              <DroppableColumn
                key={col}
                column={col}
                tasks={tasks.filter((t) => t.status === col)}
                onViewTask={onTaskSelect}
              />
            ))}
          </div>
        </DndContext>
      </div>

      {showTaskModal && (
        <Modal title="Create new task" onClose={() => setShowTaskModal(false)} size="large">
          <div className="task-grid">
            <div className="col-main">
              <label className="full-width">
                <div style={{ fontSize: 13, color: "#374151", marginBottom: 6 }}>Title</div>
                <input
                  placeholder="Task name"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                />
              </label>

                <label>
                  <div style={{ fontSize: 13, color: "#374151", marginBottom: 6 }}>Description</div>
                  <textarea
                    placeholder="Add a description..."
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    style={{ minHeight: 80, padding: 8, borderRadius: 4, border: "1px solid #e5e7eb", fontFamily: "inherit" }}
                  />
                </label>

              <label>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: "#374151", marginBottom: 6 }}>Status</div>
                    <select
                      value={taskStatus}
                      onChange={(e) => setTaskStatus(e.target.value)}
                    >
                      {currentColumns.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ width: 140 }}>
                    <div style={{ fontSize: 13, color: "#374151", marginBottom: 6 }}>Priority</div>
                    <select
                      value={taskPriority}
                      onChange={(e) => setTaskPriority(e.target.value)}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
              </label>

              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: "#374151", marginBottom: 6 }}>Assignee</div>
                  <select
                    value={taskAssigneeId ?? ""}
                    onChange={(e) => setTaskAssigneeId(e.target.value || null)}
                  >
                    <option value="">Unassigned</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ width: 160 }}>
                  <div style={{ fontSize: 13, color: "#374151", marginBottom: 6 }}>Due date</div>
                  <input
                    type="date"
                    value={taskDueDate ?? ""}
                    onChange={(e) => setTaskDueDate(e.target.value || null)}
                  />
                </div>

                <div style={{ width: 120 }}>
                  <div style={{ fontSize: 13, color: "#374151", marginBottom: 6 }}>Estimate (hrs)</div>
                  <input
                    type="number"
                    min={0}
                    value={taskEstimate ?? ""}
                    onChange={(e) => setTaskEstimate(e.target.value ? parseFloat(e.target.value) : undefined)}
                    placeholder="8"
                  />
                </div>
              </div>

              </div>

            <div className="col-side">
              <div>
                  <div style={{ fontSize: 13, color: "#374151", marginBottom: 6 }}>Labels</div>
                  <input
                    placeholder="Add labels, comma separated"
                    value={taskLabelsInput}
                    onChange={(e) => setTaskLabelsInput(e.target.value)}
                  />

                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                    {taskLabelsInput
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean)
                      .slice(0, 10)
                      .map((lab) => (
                        <span key={lab} className="badge label">
                          {lab}
                        </span>
                      ))}
                  </div>
              </div>

              <div>
                <button className="primary-btn" onClick={addTask}>
                  Create task
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

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
