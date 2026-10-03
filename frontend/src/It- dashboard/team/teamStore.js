import { createContext, useContext, useSyncExternalStore } from 'react';
import { assignTeam, createTeamState } from './teamData.js';
import { withWorkloads } from './workload.js';
let state = createTeamState();
const listeners = new Set();
const subscribe = listener => { listeners.add(listener); return () => listeners.delete(listener); };
export const TeamDataContext = createContext(null);
export const useBaseTeamState = () => useSyncExternalStore(subscribe, () => state);
export function useTeamState() {
  const base = useBaseTeamState();
  const shared = useContext(TeamDataContext);
  return withWorkloads(shared || { ...base, saveAssignment });
}
export function saveAssignment(projectId, values) {
  state = assignTeam(state, projectId, values);
  listeners.forEach(listener => listener());
}

export function saveDemoProject(project) {
  state = { ...state, projects: state.projects.map(item => item.id === project.id ? { ...item, ...project, status: project.status === 'Active' ? 'In Progress' : project.status === 'New' ? 'Open' : project.status } : item),
    tasks: project.tasks ? [...state.tasks.filter(task => task.projectId !== project.id), ...project.tasks.map(task => ({ ...task, status: task.status === 'Completed' ? 'Done' : task.status }))] : state.tasks };
  listeners.forEach(listener => listener());
}

export function setITTeamMembers(members) {
  state = { ...state, members: [...members] };
  listeners.forEach(listener => listener());
}
