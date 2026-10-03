import { isActiveProject } from './workload.js';
﻿import React, { useState } from 'react';
import { useTeamState } from './teamStore.js';
import { memberStats } from './teamData.js';
import { Page, TableCard, Person, Pill, Progress, SearchField, Select, Empty } from './TeamComponents.jsx';
export default function TeamOverview() {
  const state = useTeamState();
  const [search, setSearch] = useState(''); const [role, setRole] = useState(''); const [availability, setAvailability] = useState('');
  const reset = () => { setSearch(''); setRole(''); setAvailability(''); };
  const rows = state.members.filter(member => member.name.toLowerCase().includes(search.trim().toLowerCase()) && (!role || member.role === role) && (!availability || member.availability === availability));
  return <Page title="Team Overview" description="See who's available and balance the team's workload."><TableCard title="Team members" count={rows.length} filters={<><SearchField value={search} onChange={setSearch}/><div className="tm-filter-row"><Select label="Role" value={role} onChange={setRole} options={[...new Set(state.members.map(member => member.role))]} all="All roles"/><Select label="Availability" value={availability} onChange={setAvailability} options={['Available','Busy','On Leave']} all="All availability"/><button className="tm-reset" onClick={reset}>Reset filters</button></div></>}>{rows.length ? <div className="tm-table-wrap"><table className="tm-table"><thead><tr>{['Member','Role','Current projects','Active tasks','Workload','Availability'].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{rows.map(member => { const stats = memberStats(state, member); return <tr key={member.id}><td><Person member={member}/></td><td>{member.role}</td><td className="tm-project-names">{stats.projects.filter(isActiveProject).map(project => project.name).join(', ') || 'No active projects'}</td><td>{stats.active}</td><td><Progress value={member.workload} label={`${member.name} workload`}/></td><td><Pill value={member.availability}/></td></tr>; })}</tbody></table></div> : <Empty onReset={reset}/>}</TableCard></Page>;
}
