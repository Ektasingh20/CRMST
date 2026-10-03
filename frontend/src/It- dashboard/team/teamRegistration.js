import { Users, FolderKanban, ChartNoAxesCombined } from 'lucide-react';
// Frontend demo flag only; switch to 'IT Employee' to hide TEAM and its pages.
export const MOCK_TEAM_ROLE = 'Project Manager';
export const canManageTeam = MOCK_TEAM_ROLE === 'Project Manager';
export const teamNavigation = canManageTeam ? [
  { key: 'team-overview', label: 'Team Overview', icon: Users, group: 'Team' },
  { key: 'team-assign', label: 'Assign Projects', icon: FolderKanban, group: 'Team' },
  { key: 'team-progress', label: 'Team Progress', icon: ChartNoAxesCombined, group: 'Team' },
] : [];
export const teamTitles = Object.fromEntries(teamNavigation.map(item => [item.key, item.label]));
