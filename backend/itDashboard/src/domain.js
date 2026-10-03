import { randomUUID } from 'node:crypto';
export const nowISO = () => new Date().toISOString();
export function activity(tx, {projectId,authorId,type,text,entityId}, at = nowISO()) {
  const id = `${at}-${randomUUID()}`;
  const entry = {projectId,authorId,type,text,entityId:entityId || projectId,at};
  tx.create(`itd_activity/${id}`,entry);
  return {id,...entry};
}
export function ticketActivity(tx, kind, ticket, authorId, text, at = nowISO()) {
  const entry=activity(tx,{projectId:ticket.projectId,authorId,type:kind,text,entityId:ticket.id},at);
  tx.create(`itd_${kind}/${ticket.id}/activity/${entry.id}`,entry);
}
export function workload(memberId, projects, bugs) {
  const bugPoints = bugs.filter(b=>b.assignedTo===memberId && b.status!=='Resolved').reduce((n,b)=>n+({Critical:5,High:3,Medium:2,Low:1}[b.priority]||0),0);
  const projectPoints = projects.filter(p=>!['Completed','Rejected'].includes(p.status) && p.team?.some(t=>t.memberId===memberId)).reduce((n,p)=>n+({Urgent:8,Critical:8,High:6,Medium:4,Low:2}[p.priority]||0)/p.team.length,0);
  return {bugPoints,projectPoints,workload:Math.round((bugPoints+projectPoints)/20*10000)/100};
}
