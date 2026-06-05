import { useState } from "react";
import { Pencil } from "lucide-react";

export default function EditableMeta({
  label,
  value,
  options,
  onChange,
}: any) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="meta-item">
      <span className="meta-label">{label}</span>

      {!editing ? (
        <div
          className="meta-display"
          onClick={() => setEditing(true)}
        >
          <span>{value}</span>
          <Pencil size={14} className="icon-muted" />
        </div>
      ) : (
        <select
          autoFocus
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setEditing(false);
          }}
          onBlur={() => setEditing(false)}
        >
          {options.map((o: string) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      )}
    </div>
  );
}
