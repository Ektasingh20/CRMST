import test from 'node:test';
import assert from 'node:assert/strict';
import { dailyOverview } from './dailyOverview.js';
import { applyProjectStatus } from './projectStatus.js';
import { updateClarification, createClarifications } from './clarificationData.js';
import { createSampleBugs } from './bugData.js';
const now=new Date('2026-09-25T12:00:00');
const project={id:'p1',name:'Support portal',status:'Active',due:'2026-09-28',tasks:[{id:1,title:'Overdue',status:'Pending',dueDate:'2026-09-24'},{id:2,title:'Today',status:'Pending',dueDate:'2026-09-25'},{id:3,title:'Done',status:'Completed',dueDate:'2026-09-20'}]};
test('daily task counts exclude completed work and do not mark today overdue',()=>{
  const data=dailyOverview([project],[],[],now);
  assert.equal(data.pending.length,2);assert.equal(data.overdue.length,1);assert.equal(data.pending[0].id,1);assert.equal(data.projectRows[0].progress,33);
  assert.equal(data.attention.length,2);
});
test('completion and reopening update project cards, tasks, progress and activity',()=>{
  const completed=applyProjectStatus(project,{status:'Completed',remarks:'Delivered',completionDate:'2026-09-25',allTasksCompleted:true,files:[]},now.toISOString());
  let data=dailyOverview([completed],[],[],now);
  assert.equal(data.active.length,0);assert.equal(data.completed.length,1);assert.equal(data.pending.length,0);assert.equal(data.activity.length,1);
  const reopened=applyProjectStatus(completed,{status:'In Progress',progress:80,remarks:'New scope'},now.toISOString());
  data=dailyOverview([reopened],[],[],now);assert.equal(data.active.length,1);assert.equal(data.completed.length,0);assert.equal(data.projectRows[0].progress,80);
});
test('resolving a priority bug removes its alert and updates unresolved totals',()=>{
  const bugs=createSampleBugs();const before=dailyOverview([],bugs,[],now);
  const after=dailyOverview([],bugs.map(b=>b.id===bugs[0].id?{...b,status:'Resolved'}:b),[],now);
  assert.equal(after.openBugs.length,before.openBugs.length-1);assert.equal(after.attention.length,before.attention.length-1);
});
test('answered clarifications leave the pending count and replies enter recent activity',()=>{
  const original=createClarifications()[0];
  const replied=updateClarification(original,{type:'reply',id:'reply',text:'Confirmed.'},'Ekta Singh',now.toISOString());
  const answered=updateClarification(replied,{type:'answer',id:'answer'},'Ekta Singh',now.toISOString());
  assert.equal(dailyOverview([],[],[original],now).unanswered.length,1);
  const data=dailyOverview([],[],[answered],now);assert.equal(data.unanswered.length,0);assert.ok(data.activity.some(a=>a.detail==='Confirmed.'));
});
test('missing deadlines and empty workspaces produce safe empty views',()=>{
  assert.equal(dailyOverview([],[],[],now).attention.length,0);
  const data=dailyOverview([{...project,due:'No delivery date',tasks:[{id:'x',status:'Pending'}]}],[],[],now);
  assert.equal(data.overdue.length,0);assert.equal(data.attention.length,0);assert.equal(data.projectRows[0].deadline,null);
});
