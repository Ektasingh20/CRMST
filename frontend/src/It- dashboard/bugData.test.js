import test from 'node:test';
import assert from 'node:assert/strict';
import { createSampleBugs, filterBugs } from './bugData.js';
const empty = {search:'',status:'',priority:'',project:'',assignedTo:'',date:''};
test('sample bugs have unique IDs and complete detail records across workflow states', () => {
  const bugs=createSampleBugs();
  assert.equal(bugs.length,12);
  assert.equal(new Set(bugs.map(b=>b.id)).size,12);
  assert.deepEqual(new Set(bugs.map(b=>b.status)),new Set(['Open','In Progress','Resolved']));
  for(const b of bugs) {
    assert.ok(b.description && b.steps && b.expected && b.actual && b.activity.length);
    assert.match(b.date,/^\d{4}-\d{2}-\d{2}$/);
  }
});
test('search trims whitespace and matches identifiers and people without case sensitivity',()=>{
  const bugs=createSampleBugs();
  assert.equal(filterBugs(bugs,{...empty,search:'  bug-1042  '})[0].id,'BUG-1042');
  assert.ok(filterBugs(bugs,{...empty,search:'priya'}).every(b=>`${b.assignedTo} ${b.reportedBy}`.toLowerCase().includes('priya')));
});
test('status, priority, project, assignee and date filters intersect',()=>{
  const bugs=createSampleBugs(); const b=bugs[0];
  const filters={...empty,status:b.status,priority:b.priority,project:b.project,assignedTo:b.assignedTo,date:b.date};
  assert.deepEqual(filterBugs(bugs,filters),[b]);
  assert.equal(filterBugs(bugs,{...filters,status:'Resolved'}).length,0);
  assert.equal(filterBugs(bugs,empty).length,12);
});
test('resolved records remain available for status filtering',()=>{
  assert.equal(filterBugs(createSampleBugs(),{...empty,status:'Resolved'}).length,2);
});
