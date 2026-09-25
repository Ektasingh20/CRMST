import { dailyOverview, dateValue } from './dailyOverview.js';
export function personalWork(projects, bugs, clarifications, person, now = new Date()) {
  const identity = String(person).trim().toLowerCase();
  const mine = value => String(value || '').trim().toLowerCase() === identity;
  const myBugs = bugs.filter(bug => mine(bug.assignedTo));
  const myQuestions = clarifications.filter(item => mine(item.assignedTo) || mine(item.askedBy));
  const overview = dailyOverview(projects, myBugs, myQuestions, now);
  const today = new Date(now); today.setHours(0,0,0,0);
  const nextWeek = new Date(today); nextWeek.setDate(nextWeek.getDate() + 7);
  const findProject = name => projects.find(project => [project.name, project.projectName].includes(name));
  const deadlines = overview.projectRows.filter(row => row.deadline);
  const overdue = deadlines.filter(row => row.deadline < today);
  const approaching = deadlines.filter(row => row.deadline >= today && row.deadline <= nextWeek);
  const delayed = overview.projectRows.filter(row => row.status === 'On Hold' || overview.overdue.some(task => String(task.project.id) === String(row.project.id)));
  const attention = [
    ...overdue.map(row => ({id:`overdue-${row.project.id}`,title:row.project.name,reason:'Project deadline overdue',project:row.project,deadline:row.deadline,urgent:true})),
    ...delayed.map(row => ({id:`delay-${row.project.id}`,title:row.project.name,reason:row.status==='On Hold'?'Project on hold':`${overview.overdue.filter(task=>String(task.project.id)===String(row.project.id)).length} overdue work item(s) affecting delivery`,project:row.project,urgent:true})),
    ...overview.openBugs.filter(b=>['Critical','High'].includes(b.priority)).map(b=>({id:b.id,title:b.title,reason:`${b.id} · ${b.priority} priority bug assigned to you`,project:findProject(b.project),page:'open-bugs',urgent:true})),
    ...overview.unanswered.map(c=>({id:c.id,title:c.subject,reason:`${c.id} · ${c.status}`,project:findProject(c.project),page:'clarification'})),
    ...approaching.map(row=>({id:`due-${row.project.id}`,title:row.project.name,reason:'Project deadline within 7 days',project:row.project,deadline:row.deadline})),
  ];
  const upcoming = [
    ...approaching.map(row=>({id:`delivery-${row.project.id}`,title:row.project.name,reason:'Prepare delivery and review remaining work',project:row.project,deadline:row.deadline})),
    ...projects.filter(p=>p.status==='New').map(p=>({id:`new-${p.id}`,title:p.name,reason:'New assignment · Review requirements before starting',project:p,deadline:dateValue(p.expectedDelivery||p.due)})),
    ...overview.projectRows.filter(row=>row.deadline>nextWeek).map(row=>({id:`planned-${row.project.id}`,title:row.project.name,reason:'Upcoming project delivery',project:row.project,deadline:row.deadline})),
  ].sort((a,b)=>(a.deadline?.getTime()??Infinity)-(b.deadline?.getTime()??Infinity));
  return {...overview,deadlines,overdueProjects:overdue,approaching,delayed,attention,upcoming};
}
