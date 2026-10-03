import { requireThat } from './errors.js';
import { manager } from './auth.js';
import { publicRecord } from './validation.js';
import { workload } from './domain.js';
export function createReads(store,cache,maxRecords=5000) {
  async function bounded(path,filters=[]) {
    const fields={
      itd_projects:['name','client','priority','status','executionStatus','progress','startDate','dueDate','team','memberIds','completionDate','updatedAt'],
      itd_tasks:['projectId','memberId','title','status','dueDate','completedAt'],
      itd_bugs:['title','projectId','priority','status','assignedTo','reportedBy','date'],
      itd_clarifications:['subject','projectId','priority','status','askedBy','assignedTo','at'],
      itd_members:['userId','userPath','name','teamRole','appRole','onLeave','disabled'],
    }[path];
    const rows=await store.query(path,{filters,limit:maxRecords+1,fields});
    requireThat(rows.length<=maxRecords,413,'Workspace exceeds snapshot limit; partition the workspace before increasing this limit.');
    return rows;
  }
  async function scope(member,kinds=['tasks','bugs','clarifications']) {
    const key=manager(member)?'manager':member.id;
    const projects=await cache.get(`projects:${key}`,()=>bounded('itd_projects',manager(member)?[]:[['memberIds','array-contains',member.id]]));
    const load=async kind=>cache.get(`${kind}:${key}`,async()=>{
      if(manager(member))return bounded(`itd_${kind}`);
      const rows=[];
      for(let i=0;i<projects.length;i+=30)rows.push(...await bounded(`itd_${kind}`,[['projectId','in',projects.slice(i,i+30).map(p=>p.id)]]));
      requireThat(rows.length<=maxRecords,413,'Workspace exceeds snapshot limit.');return rows;
    });
    const values=await Promise.all(kinds.map(load));
    return {projects,...Object.fromEntries(kinds.map((kind,i)=>[kind,values[i]]))};
  }
  async function activities(member,projects) {
    return cache.get(`activity:${manager(member)?'manager':member.id}`,async()=>{
      let rows=[], total=0;
      if(manager(member)){[rows,total]=await Promise.all([store.query('itd_activity',{limit:maxRecords+1}),store.count('itd_activity')]);}
      else for(let i=0;i<projects.length;i+=30){ const filters=[['projectId','in',projects.slice(i,i+30).map(p=>p.id)]]; const [page,count]=await Promise.all([store.query('itd_activity',{filters,limit:maxRecords+1}),store.count('itd_activity',filters)]);rows.push(...page);total+=count; }
      requireThat(rows.length<=maxRecords,413,'Activity history exceeds the dashboard snapshot limit.');
      return {total,items:rows.sort((a,b)=>b.at.localeCompare(a.at)).slice(0,25)};
    });
  }
  async function dashboard(member,limit=3) {
    const data=await scope(member);
    const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    const week=new Date(`${today}T00:00:00Z`);week.setUTCDate(week.getUTCDate()+7);const nextWeek=week.toISOString().slice(0,10);
    const active=data.projects.filter(p=>p.status==='Active');const activeIds=new Set(active.map(p=>p.id));
    const pending=data.tasks.filter(t=>activeIds.has(t.projectId)&&t.status!=='Done'&&(manager(member)||t.memberId===member.id)).sort((a,b)=>(a.dueDate||'9999').localeCompare(b.dueDate||'9999')||a.id.localeCompare(b.id));
    const overdue=pending.filter(t=>t.dueDate&&t.dueDate<today);
    const bugs=data.bugs.filter(b=>b.status!=='Resolved');
    const clarifications=data.clarifications.filter(c=>['Needs Clarification','Waiting for Reply'].includes(c.status));
    const attention=[...overdue.map(t=>({...publicRecord(t),kind:'task',key:`task:${t.id}`})),...bugs.filter(b=>['Critical','High'].includes(b.priority)).sort((a,b)=>(a.priority==='Critical'?0:1)-(b.priority==='Critical'?0:1)).map(b=>({...publicRecord(b),kind:'bug',key:`bug:${b.id}`})),...active.filter(p=>p.dueDate&&p.dueDate<=nextWeek).sort((a,b)=>a.dueDate.localeCompare(b.dueDate)).map(p=>({...publicRecord(p),kind:'project',key:`project:${p.id}`}))];
    const overdueIds=new Set(overdue.map(t=>t.id));const myWork=pending.filter(t=>!overdueIds.has(t.id));
    const events=await activities(member,data.projects);
    return {stats:{activeProjects:active.length,completedProjects:data.projects.filter(p=>p.status==='Completed').length,pendingTasks:pending.length,overdueTasks:overdue.length,openBugs:bugs.length,criticalBugs:bugs.filter(b=>b.priority==='Critical').length,clarifications:clarifications.length},
      myWork:{total:myWork.length,items:myWork.slice(0,limit).map(publicRecord)},attention:{total:attention.length,items:attention.slice(0,limit)},projects:{total:active.length,items:active.sort((a,b)=>(a.dueDate||'9999').localeCompare(b.dueDate||'9999')).slice(0,limit).map(publicRecord)},activity:{total:events.total,items:events.items.slice(0,limit).map(publicRecord)},asOf:new Date().toISOString()};
  }
  async function list(member,kind,{limit=25,cursor='',projectId,status}={}) {
    let rows=(await scope(member,kind==='projects'?[]:[kind]))[kind];
    if(projectId)rows=rows.filter(r=>r.projectId===projectId);
    if(status)rows=rows.filter(r=>r.status===status);
    rows.sort((a,b)=>a.id.localeCompare(b.id));const total=rows.length;
    if(cursor)rows=rows.filter(r=>r.id>cursor);
    const items=rows.slice(0,limit).map(publicRecord);
    return {items,total,nextCursor:rows.length>limit?items.at(-1).id:null};
  }
  async function teamOverview(member) {
    const [data,members]=await Promise.all([scope(member,['bugs']),cache.get('members',()=>bounded('itd_members'))]);
    return {members:members.map(m=>({...publicRecord(m),...workload(m.id,data.projects,data.bugs)})),projects:data.projects.length};
  }
  return {scope,dashboard,list,teamOverview,members:()=>cache.get('members',async()=> (await bounded('itd_members')).map(publicRecord))};
}
