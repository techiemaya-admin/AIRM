"use client";

import { useEffect, useState } from "react";
import "./CreateProjectModal.css";
import { templates, ProjectTemplate } from "@/lib/templates";
import BoardView from "@/components/views/BoardView";
import Modal from "@/components/views/Modal";

/* ================= TYPES ================= */

type Member = { name: string; email: string };

type Props = {
  open: boolean;
  onClose: () => void;
  mode?: "create" | "edit";
  initialData?: any;

  onCreateScratch: (data: {
    name: string;
    description: string;
    managerName: string;
    managerEmail: string;
    teamMembers: Member[];
    roles: string;
    sprintLength: string;
  }) => void;

  onUpdate?: (projectId: string, data: any) => void;
  onCreateTemplate: (template: ProjectTemplate, projectData: any) => void;
};

export default function CreateProjectModal({
  open,
  onClose,
  mode = "create",
  initialData,
  onCreateScratch,
  onUpdate,
  onCreateTemplate,
}: Props) {
  const [viewMode, setViewMode] =
    useState<"choice" | "scratch" | "templates" | "templateDetails" | "templatePreview" | "templateForm">("choice");

  const [templateSearch, setTemplateSearch] = useState("");
  const [previewTemplate, setPreviewTemplate] = useState<ProjectTemplate | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);

  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [managerName, setManagerName] = useState("");
  const [managerEmail, setManagerEmail] = useState("");

  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [teamMembers, setTeamMembers] = useState<Member[]>([]);

  const [roles, setRoles] = useState("");
  const [sprintLength, setSprintLength] = useState("2 weeks");

  /* ================= PREFILL EDIT ================= */

  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && initialData) {
      setViewMode("scratch");
      setProjectName(initialData.name || "");
      setProjectDescription(initialData.description || "");
      setManagerName(initialData.manager || "");
      setManagerEmail(initialData.manager_email || "");
      setSprintLength(`${Math.round((initialData.sprint_length || 14) / 7)} weeks`);
      setTeamMembers(initialData.members || []);
      setRoles(initialData.roles || "");
    }
  }, [open, mode, initialData?.id]);

  if (!open) return null;

  /* ================= HELPERS ================= */

  const resetForm = () => {
    setViewMode("choice");
    setProjectName("");
    setProjectDescription("");
    setManagerName("");
    setManagerEmail("");
    setMemberName("");
    setMemberEmail("");
    setTeamMembers([]);
    setRoles("");
    setSprintLength("2 weeks");
    setTemplateSearch("");
    setPreviewTemplate(null);
    setSelectedTemplate(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const generateSampleTasks = (template: ProjectTemplate) => {
    const tasks: any[] = [];
    let id = 1;
    template.phases.forEach((phase) => {
      phase.tasks.forEach((taskTitle) => {
        tasks.push({
          id: `sample-${id++}`,
          title: taskTitle,
          status: phase.name,
          priority: "medium",
          assignee: "Sample User",
          labels: ["sample"],
          due_date: null,
        });
      });
    });
    return tasks;
  };

  const handleAddMember = () => {
    if (!memberName.trim() && !memberEmail.trim()) return;

    setTeamMembers((prev) => [
      ...prev,
      { name: memberName.trim(), email: memberEmail.trim() },
    ]);

    setMemberName("");
    setMemberEmail("");
  };

  const removeMember = (index: number) => {
    setTeamMembers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
  // ✅ REMOVE manager if it already exists in teamMembers
  const membersWithoutManager = teamMembers.filter(
    (m: any) => m.role !== "Manager"
  );

  // ✅ ADD EXACTLY ONE MANAGER
  const finalMembers = [
    {
      name: managerName,
      email: managerEmail,
      role: "Manager",
    },
    ...membersWithoutManager.map((m: any) => ({
      name: m.name,
      email: m.email,
      role: m.role || "Member",
    })),
  ];

  const payload = {
    name: projectName,
    description: projectDescription,
    managerName,
    managerEmail,
    teamMembers: finalMembers,
    roles,
    sprintLength,
  };

  if (mode === "edit" && onUpdate && initialData?.id) {
    onUpdate(initialData.id, payload);
  } else if (selectedTemplate) {
    onCreateTemplate(selectedTemplate, payload);
  } else {
    onCreateScratch(payload);
  }

  handleClose();
};

  /* ================= FORM RENDER ================= */

  const renderForm = (
    title: string,
    subtitle: string,
    submitLabel: string
  ) => (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-form" onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        <p className="form-subtitle">{subtitle}</p>

        <div className="form-fields">
          <div className="form-field">
            <label>Project name</label>
            <input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label>Description</label>
            <textarea
              rows={4}
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label>Project manager</label>
            <div className="form-row">
              <input
                placeholder="Manager name"
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
              />
              <input
                placeholder="Manager email"
                value={managerEmail}
                onChange={(e) => setManagerEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="form-field">
            <label>Team members</label>
            <div className="form-row">
              <input
                placeholder="Member name"
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
              />
              <input
                placeholder="Member email"
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
              />
              <button className="btn-add" onClick={handleAddMember}>
                Add
              </button>
            </div>

            <div className="members-display">
              {teamMembers.length === 0
                ? "No members added."
                : teamMembers.map((m, i) => (
                    <div key={i} className="member-chip">
                      <span>
                        {m.name} {m.email && `(${m.email})`}
                      </span>
                      <button
                        className="remove-member"
                        onClick={() => removeMember(i)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
            </div>
          </div>

          <div className="form-field">
            <label>Per-project roles</label>
            <input
              value={roles}
              onChange={(e) => setRoles(e.target.value)}
              placeholder="Name:Role"
            />
          </div>

          <div className="form-field">
            <label>Default sprint length</label>
            <select
              value={sprintLength}
              onChange={(e) => setSprintLength(e.target.value)}
            >
              <option value="1 week">1 week</option>
              <option value="2 weeks">2 weeks</option>
              <option value="3 weeks">3 weeks</option>
              <option value="4 weeks">4 weeks</option>
            </select>
          </div>
        </div>

        <div className="form-actions">
          <button className="btn-outline" onClick={handleClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleSubmit}>
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );

  /* ================= VIEW SWITCH ================= */

  if (viewMode === "scratch") {
    return mode === "edit"
      ? renderForm("Edit project", "Update project details.", "Update Project")
      : renderForm(
          "New project",
          "Provide details to set up the workspace.",
          "Create Project"
        );
  }

  if (viewMode === "templates") {
    const filteredTemplates = templates.filter(
      (t) =>
        t.title.toLowerCase().includes(templateSearch.toLowerCase()) ||
        t.description.toLowerCase().includes(templateSearch.toLowerCase())
    );

    return (
      <div className="modal-overlay" onClick={handleClose}>
        <div className="modal-templates" onClick={(e) => e.stopPropagation()}>
          <div className="templates-header">
            <h2>Select a template</h2>
            <input
              placeholder="Search templates..."
              value={templateSearch}
              onChange={(e) => setTemplateSearch(e.target.value)}
            />
          </div>

          <div className="templates-grid">
            {filteredTemplates.map((template) => (
              <div key={template.id} className="template-card">
                <h3>{template.title}</h3>
                <p>{template.subtitle}</p>

                <div className="template-actions">
                  <button
                    className="btn-preview"
                    onClick={() => {
                      setSelectedTemplate(template);
                      setViewMode("templateDetails");
                    }}
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (previewTemplate) {
    const sampleTasks = generateSampleTasks(previewTemplate);
    const columns = previewTemplate.phases.map(p => p.name);

    return (
      <div className="modal-overlay" onClick={handleClose}>
        <div className="modal-preview" onClick={(e) => e.stopPropagation()}>
          <div className="preview-header">
            <h2>Preview: {previewTemplate.title}</h2>
            <button className="btn-close-preview" onClick={() => setPreviewTemplate(null)}>✕</button>
          </div>
          <p style={{ marginBottom: "20px", color: "#6b7280", padding: "0 20px" }}>
            {previewTemplate.description}
          </p>
          <div style={{ padding: "0 20px", flex: 1, overflowY: "auto" }}>
            <BoardView
              tasks={sampleTasks}
              setTasks={() => {}} // No-op for preview
              onTaskSelect={(task) => {
                // Show a simple alert or modal with task details
                alert(`Task: ${task.title}\nStatus: ${task.status}\nPriority: ${task.priority}\nAssignee: ${task.assignee}`);
              }}
              projectId="" // Not needed for preview
              columns={previewTemplate.phases.map(p => p.name)}
            />
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === "templateDetails" && selectedTemplate) {
    return (
      <div className="modal-overlay" onClick={handleClose}>
        <div className="modal-template-details" onClick={(e) => e.stopPropagation()}>
          <div className="details-header">
            <button className="btn-back" onClick={() => setViewMode("templates")}>← Back</button>
            <h2>{selectedTemplate.title}</h2>
          </div>

          <div className="details-content">
            <p className="details-description">{selectedTemplate.description}</p>
            
            <div className="template-info">
              <div className="info-item">
                <span className="info-label">Total Tasks:</span>
                <span className="info-value">{selectedTemplate.taskCount}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Default Sprint:</span>
                <span className="info-value">{selectedTemplate.sprintLength}</span>
              </div>
            </div>

            <div className="phases-overview">
              <h3>Project Phases & Tasks</h3>
              {selectedTemplate.phases.map((phase) => (
                <div key={phase.name} className="phase-item">
                  <h4>{phase.name}</h4>
                  <ul>
                    {phase.tasks.map((task, idx) => (
                      <li key={idx}>{task}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="details-actions">
            <button className="btn-outline" onClick={() => {
              setViewMode("templatePreview");
              setPreviewTemplate(selectedTemplate);
            }}>
              Preview Board
            </button>
            <button className="btn-primary" onClick={() => {
              setProjectName(selectedTemplate.title);
              setSprintLength(selectedTemplate.sprintLength);
              setViewMode("templateForm");
            }}>
              Use Template
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === "templatePreview" && previewTemplate) {
    const sampleTasks = generateSampleTasks(previewTemplate);

    return (
      <div className="modal-overlay" onClick={handleClose}>
        <div className="modal-preview" onClick={(e) => e.stopPropagation()}>
          <div className="preview-header">
            <button className="btn-back" onClick={() => setViewMode("templateDetails")}>← Back</button>
            <h2>Preview: {previewTemplate.title}</h2>
          </div>
          <p style={{ marginBottom: "20px", color: "#6b7280", padding: "0 20px" }}>
            {previewTemplate.description}
          </p>
          <div style={{ padding: "0 20px", flex: 1, overflowY: "auto" }}>
            <BoardView
              tasks={sampleTasks}
              setTasks={() => {}} // No-op for preview
              onTaskSelect={(task) => {}}
              projectId="" // Not needed for preview
              columns={previewTemplate.phases.map(p => p.name)}
            />
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === "templateForm" && selectedTemplate) {
    return mode === "edit"
      ? renderForm("Edit project", "Update project details.", "Update Project")
      : renderForm(
          "Setup template project",
          `Configure your ${selectedTemplate.title} project.`,
          "Create Project"
        );
  }

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2>Create project</h2>

        <button className="btn-primary" onClick={() => setViewMode("scratch")}>
          Create from scratch
        </button>

        <button className="btn-outline" onClick={() => setViewMode("templates")}>
          Use default template
        </button>

        <div className="modal-footer">
          <button className="btn-outline" onClick={handleClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
