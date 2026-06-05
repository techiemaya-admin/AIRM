"use client";

export default function Modal({
  title,
  children,
  onClose,
  size = "default",
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  size?: "default" | "large";
}) {
  return (
    <div className="modal-overlay">
      <div className={`modal ${size === "large" ? "modal-large" : ""}`}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
