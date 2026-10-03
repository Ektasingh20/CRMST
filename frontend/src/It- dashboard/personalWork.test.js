import test from 'node:test';
import assert from 'node:assert/strict';
import { personalWork } from './personalWork.js';
const now=new Date('2026-09-25T12:00:00');
const projects=[
  {id:'late',name:'Delayed portal',status:'Active',due:'2026-09-24',tasks:[{id:'t',title:'Review',status:'Pending',dueDate:'2026-09-23'}]},
  {id:'soon',name:'Upcoming portal',status:'Active',due:'2026-09-28',progress:65,tasks:[]},
  {id:'hold',name:'On hold',status:'Active',executionStatus:'On Hold',tasks:[]},
  {id:'new',name:'New portal',status:'New',due:'2026-10-01'},
  {id:'done',name:'Completed portal',status:'Completed',due:'2026-09-20'},
];
test('personal overview groups overdue, approaching, delayed and new project work',()=>{
  const data=personalWork(projects,[],[],'Ekta Singh',now);
  assert.equal(data.overdueProjects.length,1);assert.equal(data.approaching.length,1);assert.equal(data.delayed.length,2);
  assert.equal(data.upcoming.length,2);assert.equal(data.projectRows.length,3);assert.ok(data.attention.every(item=>item.project.status!=='Completed'));
  assert.equal(data.projectRows.find(row=>row.project.id==='soon').progress,65);
});
test('only assigned priority bugs and personally relevant pending questions need attention',()=>{
  const bugs=[{id:'b1',title:'My bug',assignedTo:'Ekta Singh',priority:'High',status:'Open',project:'Upcoming portal'},{id:'b2',title:'Other bug',assignedTo:'Other Person',priority:'Critical',status:'Open',project:'Upcoming portal'},{id:'b3',title:'Fixed bug',assignedTo:'Ekta Singh',priority:'High',status:'Resolved',project:'Upcoming portal'}];
  const questions=[{id:'q1',subject:'My question',askedBy:'Ekta Singh',assignedTo:'Other Person',status:'Waiting for Reply',project:'Upcoming portal'},{id:'q2',subject:'Other question',askedBy:'Other Person',assignedTo:'Another Person',status:'Needs Clarification',project:'Upcoming portal'},{id:'q3',subject:'Answered',askedBy:'Ekta Singh',status:'Answered',project:'Upcoming portal'}];
  const data=personalWork(projects,bugs,questions,'Ekta Singh',now);
  assert.ok(data.attention.some(item=>item.id==='b1'&&item.project.id==='soon'));assert.ok(data.attention.some(item=>item.id==='q1'));
  for(const id of ['b2','b3','q2','q3'])assert.ok(!data.attention.some(item=>item.id===id));
});
test('deadline today is approaching, not overdue, and completed projects leave the overview',()=>{
  const data=personalWork([{id:'today',name:'Today',status:'Active',due:'2026-09-25'},{id:'done',status:'Completed',due:'2026-09-21'}],[],[],'Ekta Singh',now);
  assert.equal(data.overdueProjects.length,0);assert.equal(data.approaching.length,1);assert.equal(data.deadlines.length,1);
});
test('empty personal workspace has no fabricated work or activity',()=>{
  const data=personalWork([],[],[],'Ekta Singh',now);
  for(const key of ['attention','upcoming','activity','deadlines','projectRows'])assert.equal(data[key].length,0);
});
