export const PROJECT_STATUSES = ['Not Started', 'In Progress', 'On Hold', 'Completed'];
export function projectStatusSummary(project) {
  const tasks = Array.isArray(project.tasks) ? project.tasks : [];
  const completedTasks = tasks.filter(task => ['completed', 'done'].includes(String(task.status).toLowerCase())).length;
  const status = project.status === 'Completed' ? 'Completed' : PROJECT_STATUSES.includes(project.executionStatus) && project.executionStatus !== 'Completed' ? project.executionStatus : project.status === 'Active' ? 'In Progress' : 'Not Started';
  const savedProgress = Number(project.progress);
  const progress = status === 'Completed' ? 100 : Number.isFinite(savedProgress) && project.progress != null ? Math.max(0, Math.min(100, savedProgress)) : tasks.length ? Math.round(completedTasks / tasks.length * 100) : 0;
  return { status, progress, completedTasks, totalTasks: tasks.length };
}
export function applyProjectStatus(project, update, at = new Date().toISOString()) {
  if (!PROJECT_STATUSES.includes(update.status)) throw new Error('Choose a valid project status.');
  const completing = update.status === 'Completed';
  const progress = completing ? 100 : Number(update.progress);
  if (!Number.isFinite(progress) || progress < 0 || progress > 100) throw new Error('Progress must be between 0 and 100.');
  if (completing && (!update.completionDate || !update.remarks?.trim() || !update.allTasksCompleted)) throw new Error('Add a completion date and remarks, and confirm all assigned tasks are completed.');
  const files = Array.isArray(update.files) ? update.files : [];
  const previous = projectStatusSummary(project);
  return {
    ...project,
    status: completing ? 'Completed' : 'Active',
    executionStatus: update.status,
    progress,
    statusRemarks: update.remarks.trim(),
    completionDate: completing ? update.completionDate : null,
    completionRemarks: completing ? update.remarks.trim() : null,
    allTasksCompleted: completing,
    ...(completing && Array.isArray(project.tasks) ? {tasks: project.tasks.map(task => ({ ...task, status: 'Completed' }))} : {}),
    finalFiles: [...(project.finalFiles || []), ...files],
    statusHistory: [...(project.statusHistory || []), {
      id: update.id || at, at, from: previous.status, status: update.status, progress,
      remarks: update.remarks.trim(), completionDate: completing ? update.completionDate : null,
      allTasksCompleted: completing, files,
    }],
  };
}
