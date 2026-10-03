import { randomUUID } from 'node:crypto';
import { authorize, manager, membership } from './auth.js';
import { requireThat } from './errors.js';
import { activity, ticketActivity, nowISO } from './domain.js';
import { publicRecord } from './validation.js';
export function createMutations(store,cache) {
  const commit = async fn => {const value=await store.transaction(fn);cache.clear();return value;};
  async function project(tx,member,id) {return authorize(await membership(tx,member.id),await tx.get(`itd_projects/${id}`));}
  async function assignee(tx,p,memberId) {requireThat((p.memberIds||[]).includes(memberId),400,'Assignee must be on the project team.');const member=await tx.get(`itd_members/${memberId}`);requireThat(member&&!member.disabled,400,'Unknown or disabled member.');}
  async function projectUpdate(member,id,body) {
    return commit(async tx=>{
      const p=await project(tx,member,id);const at=nowISO();let updates;
      if(body.action) {requireThat(p.status==='New',409,'Project has already been reviewed.');updates={status:body.action==='accept'?'Active':'Rejected'};}
      else {
        requireThat(['Active','Completed'].includes(p.status),409,'Accept the project before updating status.');
        const status=body.status || p.status;
        requireThat(!(body.executionStatus==='Completed'&&status!=='Completed'),400,'Use status Completed to complete a project.');
        if(status==='Completed')requireThat(body.completionDate&&body.remarks?.trim(),400,'Completion date and remarks are required.');
        updates={status,executionStatus:body.executionStatus || p.executionStatus,progress:body.progress ?? p.progress};
        if(body.remarks) updates.statusRemarks=body.remarks;
        if(status==='Completed')Object.assign(updates,{executionStatus:'Completed',progress:100,completionDate:body.completionDate,completionRemarks:body.remarks});
        else if(p.status==='Completed')Object.assign(updates,{executionStatus:body.executionStatus || 'In Progress',progress:body.progress ?? 0,completionDate:null,completionRemarks:''});
      }
      const tasks=updates.status==='Completed'?await tx.query('itd_tasks',{filters:[['projectId','==',id]],limit:401}):[];
      requireThat(tasks.length<=400,409,'Atomic completion supports at most 400 tasks per project. No changes were made.');
      tx.update(p.path,{...updates,updatedAt:at,_localFields:[...new Set([...(p._localFields||[]),...Object.keys(updates)])]});
      for(const t of tasks)if(t.status!=='Done')tx.update(t.path,{status:'Done',completedAt:at,updatedAt:at});
      tx.create(`itd_statusHistory/${at}-${randomUUID()}`,{projectId:id,at,from:p.status,status:updates.status,progress:updates.progress ?? p.progress,remarks:body.remarks || '',authorId:member.id});
      activity(tx,{projectId:id,authorId:member.id,type:'project',text:`Project ${updates.status}`,entityId:id},at);
      return publicRecord({...p,...updates});
    });
  }
  async function setTeam(member,id,body) {
    return commit(async tx=>{
      const actor=await membership(tx,member.id);requireThat(manager(actor),403,'Project Manager access required.');
      const p=await project(tx,actor,id);
      const members=await Promise.all(body.team.map(t=>tx.get(`itd_members/${t.memberId}`)));
      requireThat(members.every(m=>m&&!m.disabled),400,'Every team member must have active IT membership.');
      const tasks=await tx.query('itd_tasks',{filters:[['projectId','==',id]],limit:401});
      requireThat(tasks.length<=400,409,'Team update exceeds atomic task limit.');
      const memberIds=body.team.map(t=>t.memberId);
      for(const task of tasks)if(task.memberId&&!memberIds.includes(task.memberId))tx.update(task.path,{memberId:null,updatedAt:nowISO()});
      tx.update(p.path,{team:body.team,memberIds,updatedAt:nowISO(),_localFields:[...new Set([...(p._localFields||[]),'team','memberIds'])]});
      activity(tx,{projectId:id,authorId:member.id,type:'team',text:'Project team updated'});
      return {id,team:body.team};
    });
  }
  async function taskCreate(member,body) {
    return commit(async tx=>{
      const actor=await membership(tx,member.id);requireThat(manager(actor),403,'Project Manager access required.');
      const p=await project(tx,actor,body.projectId);requireThat(p.status!=='Completed'&&p.status!=='Rejected',409,'Project is not accepting tasks.');
      await assignee(tx,p,body.memberId);
      const tasks=await tx.query('itd_tasks',{filters:[['projectId','==',p.id]],limit:401});requireThat(tasks.length<400,409,'Project task limit is 400.');
      const id=randomUUID(),task={...body,status:'Pending',completedAt:null,createdAt:nowISO()};
      tx.create(`itd_tasks/${id}`,task);activity(tx,{projectId:p.id,authorId:actor.id,type:'task',entityId:id,text:`Task created: ${body.title}`});return {id,...task};
    });
  }
  async function taskUpdate(member,id,status) {
    return commit(async tx=>{
      const t=await tx.get(`itd_tasks/${id}`);requireThat(t,404,'Task not found.');
      const p=await project(tx,member,t.projectId);const actor=await membership(tx,member.id);
      requireThat(manager(actor)||t.memberId===actor.id,403,'Only the assignee or manager can update this task.');
      requireThat(p.status==='Active',409,'Tasks can only change on active projects.');
      if(t.status===status)return publicRecord(t);
      const changes={status,completedAt:status==='Done'?nowISO():null,updatedAt:nowISO()};tx.update(t.path,changes);
      activity(tx,{projectId:t.projectId,authorId:actor.id,type:'task',entityId:id,text:`Task ${status}: ${t.title}`});return publicRecord({...t,...changes});
    });
  }
  async function ticketCreate(member,kind,body) {
    return commit(async tx=>{
      const p=await project(tx,member,body.projectId);await assignee(tx,p,body.assignedTo);
      requireThat(p.status!=='Rejected',409,'Project was rejected.');
      const counterPath=`itd_counters/${kind}`;const counter=await tx.get(counterPath);
      const number=(counter?.value ?? (kind==='bugs'?1042:108))+1;
      const id=`${kind==='bugs'?'BUG':'CLR'}-${number}`;const at=nowISO();
      const record=kind==='bugs'?{...body,id,status:'Open',reportedBy:member.id,date:at}:{...body,id,status:'Needs Clarification',askedBy:member.id,at,replyCount:0};
      tx.set(counterPath,{value:number});tx.create(`itd_${kind}/${id}`,record);
      ticketActivity(tx,kind,record,member.id,`Created ${id}`,at);return record;
    });
  }
  async function ticket(tx,member,kind,id) {
    const t=await tx.get(`itd_${kind}/${id}`);requireThat(t,404,'Ticket not found.');await project(tx,member,t.projectId);
    requireThat(kind!=='clarifications'||t.status!=='Closed',409,'Closed clarifications are read-only.');return t;
  }
  async function ticketUpdate(member,kind,id,body) {
    return commit(async tx=>{
      const t=await ticket(tx,member,kind,id);
      if(body.assignedTo)await assignee(tx,await tx.get(`itd_projects/${t.projectId}`),body.assignedTo);
      if(kind==='clarifications'&&body.status&&body.status!==t.status) {
        const next={'Needs Clarification':'Waiting for Reply','Waiting for Reply':'Answered',Answered:'Closed'};
        requireThat(next[t.status]===body.status,409,'Invalid clarification transition.');
        requireThat(body.status!=='Answered'||t.replyCount>0,409,'A reply is required before answering.');
      }
      tx.update(t.path,{...body,updatedAt:nowISO()});ticketActivity(tx,kind,t,member.id,`Updated ${id}${body.status?`: ${body.status}`:''}`);
      return publicRecord({...t,...body});
    });
  }
  async function comment(member,kind,id,text) {
    return commit(async tx=>{
      const t=await ticket(tx,member,kind,id),commentId=randomUUID(),at=nowISO();const row={text,authorId:member.id,at};
      tx.create(`${t.path}/${kind==='bugs'?'comments':'replies'}/${commentId}`,row);
      if(kind==='clarifications')tx.update(t.path,{replyCount:(t.replyCount||0)+1,updatedAt:at});
      ticketActivity(tx,kind,t,member.id,`${kind==='bugs'?'Comment':'Reply'} added to ${id}`,at);return {id:commentId,...row};
    });
  }
  async function clarificationAction(member,id,{type,text}) {
    return commit(async tx=>{
      const ticketRow=await ticket(tx,member,'clarifications',id);const at=nowISO();const updates={updatedAt:at};
      if(type==='reply'||type==='send'||type==='answer') {
        requireThat(typeof text==='string'&&text.trim(),400,'Text is required for this action.');
        if(type==='send')requireThat(ticketRow.status==='Needs Clarification',409,'Only a clarification awaiting a response can be sent.');
        if(type==='answer') {
          requireThat(ticketRow.status==='Waiting for Reply',409,'Only a clarification waiting for a reply can be answered.');
          requireThat(ticketRow.replyCount>0,409,'A reply is required before answering.');
        }
        const replyId=randomUUID();const row={text:text.trim(),authorId:member.id,at};
        tx.create(`${ticketRow.path}/replies/${replyId}`,row);
        updates.replyCount=(ticketRow.replyCount||0)+1;
        if(type==='send')updates.status='Waiting for Reply';
        if(type==='answer')updates.status='Answered';
      } else if(type==='close') {
        requireThat(ticketRow.status==='Answered',409,'Only an answered clarification can be closed.');
        updates.status='Closed';
      }
      tx.update(ticketRow.path,updates);
      ticketActivity(tx,'clarifications',ticketRow,member.id,`Clarification ${id}: ${type}`,at);
      return publicRecord({...ticketRow,...updates});
    });
  }
  return {projectUpdate,setTeam,taskCreate,taskUpdate,ticketCreate,ticketUpdate,comment,clarificationAction,ticket,commit};
}
