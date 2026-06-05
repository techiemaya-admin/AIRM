"use client";

import "./ProjectCard.css";
import { useRouter } from "next/navigation";

type Props = {
  project: {
    id: string;
    name: string;
    description: string;
    sprint_length: number;
    members_count: number;
  };
  onEdit: () => void;
  onDelete: () => void;
};

export default function ProjectCard({ project, onEdit, onDelete }: Props) {
  const router = useRouter();

  return (
    <div
      className="project-card"
      onClick={() => router.push(`/dashboard/projects/${project.id}`)}
    >
      <h3>{project.name}</h3>
      <p>{project.description || "No description"}</p>

      <div className="project-meta">
        <span>Sprint: {project.sprint_length} weeks</span>
        <span>{project.members_count} members</span>
      </div>

      {/* ACTIONS */}
      <div className="project-actions">
        <button
          className="btn-outline"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          Edit
        </button>

        <button
          className="btn-danger"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
