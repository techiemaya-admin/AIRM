import React from 'react';
import Projects from '@features/projects';

export default function ProjectManagementPage() {
  return (
    <div className="h-full flex flex-col overflow-auto bg-[#f6f8fa]/30">
      <Projects />
    </div>
  );
}
