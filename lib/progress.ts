export type ProgressSubtask = {
  is_completed: boolean;
};

export type ProgressSnapshot = {
  completed: number;
  total: number;
  percent: number;
};

export function calculateSubtaskProgress(subtasks: ProgressSubtask[]): ProgressSnapshot {
  const total = subtasks.length;
  const completed = subtasks.filter((subtask) => subtask.is_completed).length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  return {
    completed,
    total,
    percent,
  };
}
