import { projectStatusSummary } from './projectStatus.js';
export function dateValue(value) {
  if (!value) return null;
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value);
  return Number.isNaN(date.getTime()) ? null : date;
}
export function dailyOverview(projects, bugs, clarifications, now = new Date()) {
  const today = new Date(now); today.setHours(0,0,0,0);
  const nextWeek = new Date(today); nextWeek.setDate(nextWeek.getDate()+7);
  const active = projects.filter(p=>p.status==='Active');
  const completed = projects.filter(p=>p.status==='Completed');
  const tasks = active.flatMap(project=>(Array.isArray(project.tasks)?project.tasks:[]).map((task,index)=>({...task,key:`${project.id}-${task.id||index}`,project,deadline:dateValue(task.dueDate||task.due)})));
  const pending = tasks.filter(task=>!['completed','done'].includes(String(task.status||'Pending').toLowerCase())).sort((a,b)=>(a.deadline?.getTime()??Infinity)-(b.deadline?.getTime()??Infinity));
  const overdue = pending.filter(task=>task.deadline&&task.deadline<today);
  const openBugs = bugs.filter(b=>b.status!=='Resolved');
  const unanswered = clarifications.filter(c=>['Needs Clarification','Waiting for Reply'].includes(c.status));
  const projectRows = active.map(project=>({project,...projectStatusSummary(project),deadline:dateValue(project.expectedDelivery||project.due)})).sort((a,b)=>(a.deadline?.getTime()??Infinity)-(b.deadline?.getTime()??Infinity));
  const attention = [
    ...overdue.map(task=>({id:`task-${task.key}`,title:task.title||task.name,detail:`${task.project.name||task.project.projectName} � Overdue task`,deadline:task.deadline,page:'my-work',level:'urgent'})),
    ...openBugs.filter(b=>['Critical','High'].includes(b.priority)).sort((a,b)=>(a.priority==='Critical'?0:1)-(b.priority==='Critical'?0:1)).map(b=>({id:b.id,title:b.title,detail:`${b.id} � ${b.priority} priority bug`,page:'open-bugs',level:'urgent'})),
    ...projectRows.filter(row=>row.deadline&&row.deadline<=nextWeek).map(row=>({id:`deadline-${row.project.id}`,title:row.project.name||row.project.projectName,detail:row.deadline<today?'Project deadline overdue':'Project deadline within 7 days',deadline:row.deadline,project:row.project,level:row.deadline<today?'urgent':'upcoming'})),
  ];
  const activity = [
    ...projects.flatMap(p=>(p.statusHistory||[]).map((entry,index)=>({id:`project-${p.id}-${index}`,text:`${p.name||p.projectName}: ${entry.from} ? ${entry.status}`,at:entry.at,detail:entry.remarks,project:p}))),
    ...bugs.flatMap(b=>(b.activity||[]).map((entry,index)=>({id:`bug-${b.id}-${index}`,text:entry.text,at:entry.at,detail:`${b.id} � ${b.title}`,page:'open-bugs'}))),
    ...clarifications.flatMap(c=>[...(c.activity||[]).map((entry,index)=>({id:`clar-${c.id}-${index}`,text:entry.text,at:entry.at,detail:`${c.id} � ${c.subject}`,page:'clarification'})),...(c.replies||[]).map((reply,index)=>({id:`reply-${c.id}-${index}`,text:`${reply.author} replied to ${c.id}.`,at:reply.at,detail:reply.text,page:'clarification'}))]),
  ].filter(entry=>dateValue(entry.at)).sort((a,b)=>dateValue(b.at)-dateValue(a.at));
  return {active,completed,pending,overdue,openBugs,unanswered,projectRows,attention,activity};
}
