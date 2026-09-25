import test from 'node:test';
import assert from 'node:assert/strict';
import { applyProjectStatus, projectStatusSummary } from './projectStatus.js';
const project = {id:'demo',status:'Active',description:'Keep this brief',documents:[{name:'brief.pdf'}],scopeFiles:{designRequirements:[{name:'design.pdf'}]},tasks:[{id:1,status:'Completed'},{id:2,status:'In Progress'}],history:[{text:'Project created'}]};
const complete = {status:'Completed',progress:40,remarks:'Delivery reviewed and approved.',completionDate:'2026-09-25',allTasksCompleted:true,files:[{name:'final.png',dataUrl:'data:image/png;base64,AA'}]};
test('summary derives task completion and percentage without altering source data',()=>{
  assert.deepEqual(projectStatusSummary(project),{status:'In Progress',progress:50,completedTasks:1,totalTasks:2});
  assert.deepEqual(projectStatusSummary({status:'New'}),{status:'Not Started',progress:0,completedTasks:0,totalTasks:0});
});
test('completion sets list membership, 100% progress and confirmed task completion, preserving project data',()=>{
  const completed=applyProjectStatus(project,complete,'2026-09-25T10:00:00Z');
  assert.equal(completed.status,'Completed');
  assert.equal(completed.progress,100);
  assert.equal(projectStatusSummary(completed).completedTasks,2);
  assert.equal(completed.completionDate,complete.completionDate);
  assert.equal(completed.documents,project.documents);
  assert.equal(completed.scopeFiles,project.scopeFiles);
  assert.equal(completed.history,project.history);
  assert.equal(completed.description,project.description);
  assert.equal(completed.finalFiles.length,1);
  assert.equal(completed.statusHistory[0].completionDate,complete.completionDate);
  assert.equal(project.status,'Active');
  assert.equal(project.tasks[1].status,'In Progress');
});
test('reopening returns to Active and retains final attachments and previous completion history',()=>{
  const completed=applyProjectStatus(project,complete,'2026-09-25T10:00:00Z');
  for(const status of ['Not Started','In Progress','On Hold']) {
    const reopened=applyProjectStatus(completed,{status,progress:75,remarks:'Additional work requested.'},'2026-09-25T11:00:00Z');
    assert.equal(reopened.status,'Active');
    assert.equal(projectStatusSummary(reopened).status,status);
    assert.equal(reopened.progress,75);
    assert.equal(reopened.completionDate,null);
    assert.deepEqual(reopened.finalFiles,completed.finalFiles);
    assert.equal(reopened.statusHistory.length,2);
    assert.equal(reopened.statusHistory[0].completionDate,complete.completionDate);
    assert.equal(reopened.statusHistory[1].from,'Completed');
  }
});
test('completion requires confirmation, date, and nonempty remarks; progress must be valid',()=>{
  for(const patch of [{allTasksCompleted:false},{completionDate:''},{remarks:'  '}]) assert.throws(()=>applyProjectStatus(project,{...complete,...patch}));
  for(const progress of [-1,101,NaN]) assert.throws(()=>applyProjectStatus(project,{status:'In Progress',progress,remarks:''}));
  assert.throws(()=>applyProjectStatus(project,{status:'Invalid',progress:30,remarks:''}));
});
test('repeated completion appends final files and history without losing previous deliveries',()=>{
  const first=applyProjectStatus(project,complete,'2026-09-25T10:00:00Z');
  const second=applyProjectStatus(first,{...complete,files:[{name:'release.zip'}]},'2026-09-25T12:00:00Z');
  assert.equal(second.finalFiles.length,2);
  assert.equal(second.statusHistory.length,2);
});
