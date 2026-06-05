import { useState } from "react";

export type Activity = {
  id: string;
  text: string;
  time: string;
};

export function useTaskState(initialTask: any) {
  const [task, setTask] = useState({
    ...initialTask,
    assignedTo: "Anyone",
    priority: "No priority",
    startDate: "",
    dueDate: "",
    subtasks: [],
    comments: [],
    activity: [],
  });

  const updateField = (field: string, value: any) => {
    setTask((prev: any) => ({
      ...prev,
      [field]: value,
      activity: [
        {
          id: crypto.randomUUID(),
          text: `${field} updated`,
          time: new Date().toLocaleString(),
        },
        ...prev.activity,
      ],
    }));
  };

  const addActivity = (text: string) => {
    setTask((prev: any) => ({
      ...prev,
      activity: [
        {
          id: crypto.randomUUID(),
          text,
          time: new Date().toLocaleString(),
        },
        ...prev.activity,
      ],
    }));
  };

  // ✅ THIS RETURN IS THE KEY
  return {
    task,
    updateField,
    addActivity,
  };
}
