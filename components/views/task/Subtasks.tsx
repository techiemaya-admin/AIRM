import { useState } from "react";
import { CheckSquare, Square, X } from "lucide-react";

export default function Subtasks({
  subtasks,
  onChange,
}: {
  subtasks: any[];
  onChange: (next: any[]) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const update = (id: string, updates: any) => {
    onChange(
      subtasks.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      )
    );
  };

  const remove = (id: string) => {
    onChange(subtasks.filter((s) => s.id !== id));
  };

  return (
    <div>
      <h4>Subtasks</h4>

      {subtasks.map((s) => (
        <div key={s.id} className="subtask-row">
          {s.done ? (
            <CheckSquare onClick={() => update(s.id, { done: false })} />
          ) : (
            <Square onClick={() => update(s.id, { done: true })} />
          )}

          {editingId === s.id ? (
            <input
              autoFocus
              value={s.title}
              onChange={(e) =>
                update(s.id, { title: e.target.value })
              }
              onBlur={() => setEditingId(null)}
              onKeyDown={(e) =>
                e.key === "Enter" && setEditingId(null)
              }
            />
          ) : (
            <span
              className={s.done ? "done" : ""}
              onClick={() => setEditingId(s.id)}
            >
              {s.title}
            </span>
          )}

          <X
            size={14}
            className="icon-muted"
            onClick={() => remove(s.id)}
          />
        </div>
      ))}

      <button
        className="link-btn"
        onClick={() =>
          onChange([
            ...subtasks,
            {
              id: crypto.randomUUID(),
              title: "New subtask",
              done: false,
            },
          ])
        }
      >
        + Add subtask
      </button>
    </div>
  );
}
