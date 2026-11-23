import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Users } from 'lucide-react';
import { Drawer, Person, Avatar } from './TeamComponents.jsx';
import { dateLabel, TEAM_ROLES } from './teamData.js';
import { canManageTeam } from './teamRegistration.js';
import './projectTeam.css';
import { TeamDataContext, useBaseTeamState, useTeamState, saveAssignment, setITTeamMembers } from './teamStore.js';
import { useSupportRecords } from '../supportStore.js';
import { workloadLabel } from './workload.js';

import { fetchITTeamMembers, updateITProjectTeam, syncITProjects } from "../../../backendApi.js";
const TeamContext = createContext(null);
const emptyAssignment = { team: [], startDate: '', endDate: '', priority: 'Medium', notes: '' };
const projectRoleFor = member => {
  const role = String(member.teamRole || member.role || '').toLowerCase();
  if (role.includes('test') || role.includes('qa')) return 'Tester';
  if (role.includes('design') || role.includes('ui') || role.includes('ux')) return 'Designer';
  if (role.includes('lead') || role.includes('manager')) return 'Lead';
  return TEAM_ROLES.includes(member.teamRole || member.role) ? (member.teamRole || member.role) : 'Developer';
};

// Session-only demo state; deliberately independent of project API updates.
export function ProjectTeamProvider({ children, person = 'Ekta Singh', authenticated = false }) {
  const base = useBaseTeamState();
  const [memberError, setMemberError] = useState('');
  const [membersLoading, setMembersLoading] = useState(authenticated);
  const [memberReload, setMemberReload] = useState(0);
  const reloadMembers = useCallback(() => setMemberReload(value => value + 1), []);
  useEffect(() => {
    if (!authenticated) return;
    let active = true;
    setITTeamMembers([]);
    setMemberError('');
    setMembersLoading(true);
    const load = async () => {
      for (let attempt = 0; attempt < 3 && active; attempt++) {
        try {
          const rows = await fetchITTeamMembers();
          if (!Array.isArray(rows)) throw new Error('The server returned an invalid team list.');
          if (active) { setITTeamMembers(rows); setMembersLoading(false); }
          return;
        } catch (error) {
          if (attempt === 2 || error.status === 401 || error.status === 403) {
            if (active) { setMemberError(`Unable to load IT team members: ${error.message}`); setMembersLoading(false); }
            return;
          }
          await new Promise(resolve => setTimeout(resolve, 800));
        }
      }
    };
    load();
    return () => { active = false; };
  }, [authenticated, memberReload]);
  const [bugs] = useSupportRecords('bugs', person);
  const save = async (id, values, project) => {
    const assignment = { ...values, dueDate: values.endDate ?? values.dueDate, allowEmpty: true };
    if (authenticated) {
      const payload = { team: assignment.team, startDate: assignment.startDate || null, dueDate: assignment.dueDate || null, priority: assignment.priority, notes: assignment.notes.trim() };
      try { await updateITProjectTeam(id, payload); }
      catch (error) {
        if (error.status !== 404 || !/project not found/i.test(error.message)) throw error;
        await syncITProjects();
        await updateITProjectTeam(id, payload);
      }
    }
    saveAssignment(id, assignment, project);
  };
  const shared = { ...base, members: membersLoading ? [] : base.members, bugs, saveAssignment, membersLoading, memberError, reloadMembers, authenticated };
  const assignments = Object.fromEntries(base.projects.map(project => [project.id, { ...project, endDate: project.dueDate }]));
  return <TeamDataContext.Provider value={shared}><TeamContext.Provider value={{ assignments, editable: canManageTeam, save }}>{memberError && <p role="alert">{memberError}</p>}{children}</TeamContext.Provider></TeamDataContext.Provider>;
}

export function ProjectTeamButton({ project }) {
  const { assignments, editable, save } = useContext(TeamContext);
  const [open, setOpen] = useState(false);
  if (!editable) return null;
  const assignment = assignments[project.id] || { ...emptyAssignment, team: Array.isArray(project.team) ? project.team : [], startDate: project.startDate || '', endDate: project.endDate || project.dueDate || project.expectedDelivery || project.due || '', priority: project.priority || 'Medium', notes: project.notes || '' };
  return <><button type="button" className="ghost-button pt-button" onClick={() => setOpen(true)}><Users size={15}/>{assignment.team.length ? 'Manage Team' : 'Assign Team'}</button>{open && <AssignmentDrawer project={project} assignment={assignment} onClose={() => setOpen(false)} onSave={async values => { await save(project.id, values, project); setOpen(false); }}/>}</>;
}

export function ProjectTeamAvatars({ project }) {
  const { assignments } = useContext(TeamContext);
  const { members: teamMembers } = useTeamState();
  const team = assignments[project.id]?.team || [];
  if (!team.length) return null;
  return <div className="pt-summary" role="status"><div className="pt-stack">{team.map(item => <Avatar key={item.memberId} member={teamMembers.find(member => member.id === item.memberId)}/>)}</div><span>{team.length} assigned</span></div>;
}

export function AssignedTeamCard({ project }) {
  const { assignments } = useContext(TeamContext);
  const { members: teamMembers } = useTeamState();
  const assignment = assignments[project.id] || { ...emptyAssignment, team: Array.isArray(project.team) ? project.team : [], startDate: project.startDate || '', endDate: project.endDate || project.dueDate || project.expectedDelivery || project.due || '', priority: project.priority || 'Medium', notes: project.notes || '' };
  return <section className="panel pt-card"><header><div><p className="eyebrow">PROJECT TEAM</p><h3>Assigned Team <span className="project-count">{assignment.team.length}</span></h3></div><ProjectTeamButton project={project}/></header>{assignment.team.length ? <><ul>{assignment.team.map(item => <li key={item.memberId}><Person member={teamMembers.find(member => member.id === item.memberId)}/></li>)}</ul><div className="pt-dates"><span>Start date <strong>{dateLabel(assignment.startDate)}</strong></span><span>End date <strong>{dateLabel(assignment.endDate)}</strong></span></div>{assignment.notes && <div className="pt-notes"><strong>Notes</strong><p>{assignment.notes}</p></div>}</> : <p className="pt-muted">No team members assigned yet.</p>}</section>;
}

function AssignmentDrawer({ project, assignment, onClose, onSave }) {
  const state = useTeamState();
  useEffect(() => { state.reloadMembers?.(); }, [state.reloadMembers]);
  const [draft, setDraft] = useState(() => ({ ...assignment, priority: assignment.priority || project.priority || 'Medium', team: assignment.team.map(item => ({ ...item })) }));
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const update = (key, value) => setDraft(previous => ({ ...previous, [key]: value }));
  const visibleMembers = state.members.filter(member => `${member.name} ${member.role}`.toLowerCase().includes(query.trim().toLowerCase()));
  async function submit(event) {
    event.preventDefault();
    if (draft.team.length && (!draft.startDate || !draft.endDate)) { setError('Choose a start and end date.'); return; }
    if (draft.startDate && draft.endDate && draft.endDate < draft.startDate) { setError('End date must be on or after the start date.'); return; }
    try { await onSave({ ...draft, notes: draft.notes.trim() }); } catch (err) { setError(err.message || 'Unable to save team.'); }
  }
  return <Drawer title={assignment.team.length ? 'Manage Team' : 'Assign Team'} subtitle={project.name || project.projectName} onClose={onClose}><form className="pt-form" onSubmit={submit}>
    <fieldset className="tm-members"><legend>Team members</legend><p>Select IT juniors, interns, or users without direct project assignment permission.</p><label className="tm-field">Search members<input type="search" placeholder="Search by name or role..." value={query} onChange={event => setQuery(event.target.value)}/></label><p role="status">{draft.team.length} selected · {visibleMembers.length} of {state.members.length} members</p>
      {visibleMembers.map(member => {
        const selected = draft.team.find(item => item.memberId === member.id);
        return <div className={`tm-member-option${selected ? ' pt-selected' : ''}`} key={member.id}><label><input type="checkbox" checked={Boolean(selected)} onChange={event => update('team', event.target.checked ? [...draft.team, { memberId: member.id, role: projectRoleFor(member) }] : draft.team.filter(item => item.memberId !== member.id))}/><Person member={member}/><span title={member.availability}>{workloadLabel(member.workload)}%</span></label></div>;
      })}
      {state.membersLoading && <p role="status">Loading IT team members...</p>}
      {state.memberError && <div role="alert"><p>{state.memberError}</p><button type="button" className="ghost-button" onClick={state.reloadMembers}>Retry loading members</button></div>}
      {!state.membersLoading && !state.memberError && !visibleMembers.length && <p>{state.members.length ? 'No matching members. Try another name or role.' : 'No eligible IT team members found. Add a Junior Developer or Intern, or disable direct project assignment for a custom IT role.'}</p>}
    </fieldset>
    <div className="tm-form-grid"><label className="tm-field"><span>Start date</span><input type="date" required={draft.team.length > 0} value={draft.startDate} onChange={event => update('startDate', event.target.value)}/></label><label className="tm-field"><span>End date</span><input type="date" required={draft.team.length > 0} min={draft.startDate || undefined} value={draft.endDate} onChange={event => update('endDate', event.target.value)}/></label><label className="tm-field"><span>Priority *</span><select required value={draft.priority} onChange={event => update('priority', event.target.value)}>{['Low','Medium','High','Critical','Urgent'].map(priority => <option key={priority} value={priority}>{priority}</option>)}</select></label><label className="tm-field tm-wide"><span>Notes</span><textarea rows={3} maxLength={2000} placeholder="Responsibilities, handover notes, or context..." value={draft.notes} onChange={event => update('notes', event.target.value)}/></label></div>
    {error && <p className="tm-error" role="alert">{error}</p>}
    <p className="pt-muted">{state.authenticated ? 'Team and project details are saved to the IT workspace.' : 'Demo assignments are kept while this workspace is open.'}</p>
    <div className="tm-form-actions"><button type="button" className="ghost-button" onClick={onClose}>Cancel</button><button type="submit" disabled={state.membersLoading || Boolean(state.memberError)} className="primary-button">Save Team</button></div>
  </form></Drawer>;
}
