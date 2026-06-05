"use client";

import { useEffect, useState } from "react";
import "./task-details.css";

type Member = {
  id: string;
  name: string;
};

type Comment = {
  id: string;
  text: string;
};

type Bug = {
  id: string;
  text?: string;
  description?: string;
};

export default function TaskDetailsPanel({
  task,
  projectId,
  onClose,
  onDelete,
  onTaskUpdate,
}: {
  task: any;
  projectId: string;
  onClose: () => void;
  onDelete?: (id: string) => void;
  onTaskUpdate?: (updatedTask: any) => void;
}) {
  /* ---------------- STATE ---------------- */
  const [title, setTitle] = useState(task.title || "");
  const [description, setDescription] = useState(task.description || "");
  const [status, setStatus] = useState(task.status || "todo");
  const [priority, setPriority] = useState(task.priority || "low");
  const [estimate, setEstimate] = useState(task.estimate || 8);
  const [assignee, setAssignee] = useState(task.assignee || "");
  const [assignees, setAssignees] = useState<string[]>(task.assignees || []);
  const [dueDate, setDueDate] = useState(task.due_date || "");

  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const [activities, setActivities] = useState<{
    id: string;
    text: string;
    time?: string;
    created_at?: string;
  }[]>([]);

  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");

  const [bugs, setBugs] = useState<Bug[]>([]);
  const [newBug, setNewBug] = useState("");

  // keep local assignees in sync when task prop changes
  useEffect(() => {
    setAssignees(task.assignees || []);
    setAssignee(task.assignee || "");
  }, [task?.id]);
  /* ---------------- LOAD TEAM MEMBERS ---------------- */
  useEffect(() => {
    if (!projectId) return;

    fetch(`/api/projects/${projectId}/members`)
      .then((res) => res.json())
      .then(setMembers)
      .catch(console.error);
  }, [projectId]);

  /* ---------------- LOAD COMMENTS/BUGS/ACTIVITY ---------------- */
  useEffect(() => {
    if (!task?.id) return;

    fetch(`/api/tasks/${task.id}/comments`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then(setComments)
      .catch((err) => {
        console.error("Failed to load comments:", err);
        setComments([]);
      });

    fetch(`/api/tasks/${task.id}/bugs`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then(setBugs)
      .catch((err) => {
        console.error("Failed to load bugs:", err);
        setBugs([]);
      });

    fetch(`/api/tasks/${task.id}/activities`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then(setActivities)
      .catch((err) => {
        console.error("Failed to load activities:", err);
        setActivities([]);
      });
  }, [task?.id]);

  /* ---------------- COMMENT HANDLERS ---------------- */
  const addComment = async () => {
    if (!newComment.trim()) return;
    try {
      const res = await fetch(`/api/tasks/${task.id}/comments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: newComment }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Failed to add comment");
      setComments((c) => [body, ...c]);
      setActivities((a) => [
        { id: crypto.randomUUID(), text: `Comment added: ${newComment}`, time: new Date().toISOString() },
        ...a,
      ]);
      setNewComment("");
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Failed to add comment");
    }
  };

  /* ---------------- BUG HANDLERS ---------------- */
  const addBug = async () => {
    if (!newBug.trim()) return;
    try {
      const res = await fetch(`/api/tasks/${task.id}/bugs`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ description: newBug }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Failed to report bug");
      setBugs((b) => [body, ...b]);
      setActivities((a) => [
        { id: crypto.randomUUID(), text: `Bug reported: ${newBug}`, time: new Date().toISOString() },
        ...a,
      ]);
      setNewBug("");
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Failed to report bug");
    }
  };

  /* ---------------- DELETE HANDLER ---------------- */
  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error || "Delete failed");
      onDelete?.(task.id);
      onClose();
    } catch (err) {
      console.error(err);
      alert((err as any)?.message || "Failed to delete task");
    }
  };

  /* ---------------- ASSIGNEE HANDLERS ---------------- */
  const handleAddAssignee = async (memberId: string) => {
    try {
      const newAssignees = [...assignees, memberId];
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ assignee_ids: newAssignees }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error || "Failed to assign");
      
      setAssignees(newAssignees);
      const assignedNames = newAssignees.map((id) => members.find((m) => m.id === id)?.name).filter(Boolean);
      setAssignee(assignedNames.join(", "));
      
      setActivities((a) => [
        { id: crypto.randomUUID(), text: `Added assignee`, time: new Date().toISOString() },
        ...a,
      ]);
      
      if (onTaskUpdate) {
        onTaskUpdate(body);
      }
      
      setSelectedMemberId(null);
    } catch (err) {
      console.error(err);
      alert((err as any)?.message || "Failed to assign");
    }
  };

  const handleRemoveAssignee = async (memberId: string) => {
    try {
      const newAssignees = assignees.filter((id) => id !== memberId);
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ assignee_ids: newAssignees }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error || "Failed to remove assignee");
      
      setAssignees(newAssignees);
      const assignedNames = newAssignees.map((id) => members.find((m) => m.id === id)?.name).filter(Boolean);
      setAssignee(assignedNames.join(", "));
      
      setActivities((a) => [
        { id: crypto.randomUUID(), text: `Removed assignee`, time: new Date().toISOString() },
        ...a,
      ]);
      
      if (onTaskUpdate) {
        onTaskUpdate(body);
      }
    } catch (err) {
      console.error(err);
      alert((err as any)?.message || "Failed to remove assignee");
    }
  };

  const handleSave = async () => {
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, description, priority, due_date: dueDate, estimate: parseInt(estimate.toString()) }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error || "Save failed");
      const updated = body;
      // optimistic UI update
      setTitle(updated.title ?? title);
      setDescription(updated.description ?? description);
      setPriority(updated.priority ?? priority);
      setEstimate(updated.estimate ?? estimate);
      setDueDate(updated.due_date ?? dueDate);
      
      if (onTaskUpdate) {
        onTaskUpdate(updated);
      }
      
      onClose();
    } catch (err) {
      console.error(err);
      alert((err as any)?.message || "Failed to save");
    }
  };

  return (
    <div className="gh-modal-overlay" onClick={onClose}>
      <div className="gh-modal-content" onClick={(e) => e.stopPropagation()}>
        <aside className="gh-task-panel">
      <div className="gh-main">
        <header className="gh-header">
          <div className="gh-status-pill">{status === "done" ? "Closed" : "Open"}</div>
          <input
            className="gh-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <button className="gh-close" onClick={onClose} aria-label="close">
            ✕
          </button>
        </header>

        <div className="gh-subheader">
          <div className="gh-meta">#{task?.id || "0"} opened by {task?.creator || "you"}</div>
          <div className="gh-actions">{priority} • {dueDate ? `due ${dueDate.slice(0,10)}` : "no due date"}</div>
        </div>

        <section className="gh-description">
          <label className="section-label">Description</label>
          <div className="gh-markdown">{description || <em>Add a description</em>}</div>
          <textarea
            className="gh-edit-desc"
            placeholder="Edit description..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </section>

        <section className="gh-comments">
          <label className="section-label">Comments</label>

          <div className="gh-comment-input">
            <div className="gh-avatar">JD</div>
            <input
              placeholder="Leave a comment"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
            />
            <button className="gh-btn" onClick={addComment}>Comment</button>
          </div>

          <div className="gh-comment-list">
            {comments.map((c) => (
              <div key={c.id} className="gh-comment-item">
                <div className="gh-avatar sm">U</div>
                <div className="gh-comment-body">
                  <div className="gh-comment-meta">you commented</div>
                  <div className="gh-comment-text">{c.text}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="gh-bugs">
          <label className="section-label">Bug Reports</label>
          <div className="gh-bug-input">
            <input
              placeholder="Report a bug..."
              value={newBug}
              onChange={(e) => setNewBug(e.target.value)}
            />
            <button className="gh-bug-btn" onClick={addBug}>Report</button>
          </div>
          <div className="gh-bug-list">
            {bugs.map((b) => (
              <div key={b.id} className="gh-bug-item">{b.description || b.text}</div>
            ))}
          </div>
        </section>

        <div className="gh-footer">
          <div style={{ display: "flex", gap: 8 }}>
            <button className="gh-save" onClick={handleSave}>Save changes</button>
            <button className="gh-delete delete-btn" onClick={handleDelete} style={{ background: "#ff5c5c", color: "white" }}>
              Delete
            </button>
          </div>
        </div>
      </div>

      <aside className="gh-sidebar">
        <div className="gh-card">
          <div className="gh-card-title">Assignees</div>
          <div className="gh-card-body">
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
              <select
                value={selectedMemberId ?? ""}
                onChange={(e) => setSelectedMemberId(e.target.value || null)}
              >
                <option value="">-- Select member --</option>
                {members.filter((m) => !assignees.includes(m.id)).map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              <button
                className="gh-btn"
                onClick={() => selectedMemberId && handleAddAssignee(selectedMemberId)}
                disabled={!selectedMemberId}
              >Add</button>
            </div>
            <div>
              <strong>Assigned to:</strong>
              {assignees.length === 0 ? (
                <div className="muted" style={{ marginTop: 4 }}>Unassigned</div>
              ) : (
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                  {assignees.map((assigneeId) => {
                    const member = members.find((m) => m.id === assigneeId);
                    return (
                      <div key={assigneeId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 8px", background: "#f3f4f6", borderRadius: 4 }}>
                        <span>{member?.name || assigneeId}</span>
                        <button
                          className="gh-btn"
                          onClick={() => handleRemoveAssignee(assigneeId)}
                          style={{ fontSize: 12, padding: "2px 8px" }}
                        >Remove</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="gh-card">
          <div className="gh-card-title">Estimate</div>
          <div className="gh-card-body">
            <input
              type="number"
              min="0"
              value={estimate}
              onChange={(e) => setEstimate(parseInt(e.target.value) || 0)}
              placeholder="Hours"
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "14px",
              }}
            />
            <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>Estimated hours</div>
          </div>
        </div>

        <div className="gh-card">
          <div className="gh-card-title">Due Date</div>
          <div className="gh-card-body">
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "14px",
              }}
            />
          </div>
        </div>

        <div className="gh-card">
          <div className="gh-card-title">Projects</div>
          <div className="gh-card-body">
            <div className="muted">None yet</div>
          </div>
        </div>

        <div className="gh-card">
          <div className="gh-card-title">Activity</div>
          <div className="gh-card-body">
            {activities.length === 0 ? (
              <div className="muted">No recent activity</div>
            ) : (
              <ul style={{ paddingLeft: 16, margin: 0 }}>
                {activities.map((a) => {
                  // Handle both created_at from DB and time from manual activity entries
                  const timestamp = a.created_at || a.time;
                  const dateStr = timestamp ? new Date(timestamp).toLocaleString() : 'Unknown';
                  return (
                    <li key={a.id} style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 12, color: "#666" }}>{dateStr}</div>
                      <div>{a.text}</div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </aside>
        </aside>
      </div>
    </div>
  );
}
