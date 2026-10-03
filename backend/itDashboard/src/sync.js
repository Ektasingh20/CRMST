import { createHash } from 'node:crypto';
import { requireThat } from './errors.js';
const hash = value => createHash('sha256').update(value).digest('hex');
export const projectIdFor = path => {
  const match = /^Project\/[^/]+\/([^/]+)\/Project Data$/.exec(path);
  if (!match) throw new Error('Unexpected source project path.');
  return match[1];
};
const asDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
export function mapProject(source, parent, members) {
  const path=source.path;
  const sourceFields=Object.fromEntries(Object.entries(source).filter(([key])=>key!=='id'&&key!=='path'));
  const team = members.filter(m => String(m.userId) === String(parent.assignedEmployeeId)).map(m=>({memberId:m.id,role:m.teamRole}));
  const status = ['New','Active','Completed','Rejected'].includes(source.status) ? source.status : source.status === 'In Progress' ? 'Active' : 'New';
  return {...sourceFields,name:source.projectName || source.name || 'Untitled project',client:source.client || '',priority:source.priority || 'Medium',status,
    executionStatus:status==='Completed'?'Completed':source.executionStatus || 'Not Started',progress:status==='Completed'?100:Math.max(0,Math.min(100,Number(source.progress)||0)),
    startDate:asDate(source.startDate),dueDate:asDate(source.expectedDelivery || source.dueDate || source.due),team,memberIds:team.map(t=>t.memberId),
    completionDate:asDate(source.completionDate),completionRemarks:source.completionRemarks || source.statusRemarks || '',
    sourcePath:path,description:source.description || '',documents:source.documents || [],scopeFiles:source.scopeFiles || {}};
}
async function all(store,path,fields) {
  const rows=[]; let after;
  do {const page=await store.query(path,{limit:200,after,fields});rows.push(...page);after=page.length===200?page.at(-1).id:null;requireThat(rows.length<=5000,413,'Import exceeds 5000 records; split the source manifest.');} while(after);
  return rows;
}
export async function syncProjects(store,{dryRun=true,cooldownMs=300000,owner='cli'}={}) {
  const leaseId=hash(`${owner}-${Date.now()}-${Math.random()}`);
  if(!dryRun) await store.transaction(async tx=>{
    const lock=await tx.get('itd_sync/projects');
    requireThat(!lock?.leaseUntil || lock.leaseUntil<Date.now(),409,'Sync already running.');
    requireThat(!lock?.finishedAt || Date.now()-lock.finishedAt>=cooldownMs,429,'Sync cooldown is active.');
    tx.set('itd_sync/projects',{leaseId,leaseUntil:Date.now()+30*60*1000,startedAt:new Date().toISOString()});
  });
  const report={dryRun,scanned:0,created:0,updated:0,unchanged:0,unassigned:0,tasksCreated:0,items:[]};
  try {
    const members=await all(store,'itd_members');
    const parents=await all(store.source,'Project',['assignedEmployeeId','assignedEmployeeName']);
    for(const parent of parents) {
      const collections=await store.source.projectCollections(parent.path);
      for(const collection of collections) {
        requireThat(report.scanned<5000,413,'Import exceeds 5000 projects.');
        const source=await store.source.get(`${parent.path}/${collection}/Project Data`);
        if(!source) continue;
        report.scanned++;
        const mapped=mapProject(source,parent,members);
        if(!mapped.team.length) report.unassigned++;
        const id=projectIdFor(source.path), path=`itd_projects/${id}`;
        const sourceHash=hash(JSON.stringify(mapped));
        const taskRows=(Array.isArray(source.tasks)?source.tasks:[]).map((t,i)=>({id:`import-${hash(`${source.path}/${t.id || i}`).slice(0,32)}`,projectId:id,memberId:members.find(m=>m.userId===String(t.memberId || t.assignedTo || parent.assignedEmployeeId))?.id || null,title:t.title || t.name || 'Imported task',status:['Done','Completed'].includes(t.status)?'Done':t.status==='In Progress'?'In Progress':'Pending',dueDate:asDate(t.dueDate || t.due),completedAt:t.completedAt || null}));
        requireThat(taskRows.length<=400,413,'A source project has over 400 embedded tasks; import requires an explicit split.');
        const apply=async(tx,write)=>{
          const current=await tx.get(path);
          requireThat(!current || current.sourcePath===source.path,409,`Duplicate source project ID: ${id}`);
          if(current?._sourceHash===sourceHash) return 'unchanged';
          if(!current) {
            const now=new Date().toISOString();
            if(write) {
              tx.create(path,{...mapped,_sourceHash:sourceHash,_localFields:[],createdAt:now,updatedAt:now,syncedAt:now});
              for(const task of taskRows) { const {id:taskId,...data}=task; if(mapped.status==='Completed'){data.status='Done';data.completedAt=mapped.completionDate || now;} tx.create(`itd_tasks/${taskId}`,data); }
            }
            return 'created';
          }
          // Operational state, team assignments and local changes belong to the new service.
          const protectedFields=new Set(['team','memberIds','sourcePath','status','executionStatus','progress','completionDate','completionRemarks','statusRemarks']);
          const updates=Object.fromEntries(Object.entries(mapped).filter(([key])=>!protectedFields.has(key)&&!current._localFields?.includes(key)));
          if(write) tx.update(path,{...updates,_sourceHash:sourceHash,syncedAt:new Date().toISOString()});
          return 'updated';
        };
        const result=dryRun?await apply(store,false):await store.transaction(tx=>apply(tx,true));
        report[result]++;
        const tasks=result==='created'?taskRows.length:0;
        report.items.push({sourcePath:source.path,targetPath:path,action:result,tasks});
        if(result==='created') report.tasksCreated+=taskRows.length;
      }
    }
    return report;
  } finally {
    if(!dryRun) await store.transaction(async tx=>{const lock=await tx.get('itd_sync/projects');if(lock?.leaseId===leaseId)tx.set('itd_sync/projects',{leaseId,leaseUntil:0,finishedAt:Date.now(),report});});
  }
}
