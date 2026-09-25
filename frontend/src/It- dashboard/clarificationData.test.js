import test from 'node:test';
import assert from 'node:assert/strict';
import { createClarifications, filterClarifications, updateClarification, EMPTY_FILTERS, localDate } from './clarificationData.js';
test('sample clarifications cover all statuses with unique IDs and reference history',()=>{
  const items=createClarifications();assert.equal(items.length,8);assert.equal(new Set(items.map(i=>i.id)).size,8);assert.equal(new Set(items.map(i=>i.status)).size,4);
  assert.ok(items.every(i=>i.question&&i.activity.length&&i.assignedTo));
});
test('search and all filters intersect, including the local asked date',()=>{
  const items=createClarifications();const item=items[0];
  assert.deepEqual(filterClarifications(items,{...EMPTY_FILTERS,search:` ${item.id.toLowerCase()} `,status:item.status,project:item.project,priority:item.priority,assignedTo:item.assignedTo,date:localDate(item.at)}),[item]);
  assert.equal(filterClarifications(items,{...EMPTY_FILTERS,search:item.id,status:'Closed'}).length,0);
  assert.equal(filterClarifications(items,EMPTY_FILTERS).length,8);
});
test('full status flow preserves question, attachments and timestamped replies',()=>{
  const original=createClarifications()[0];const at='2026-09-25T12:00:00Z';
  const waiting=updateClarification(original,{type:'send',id:'send'},'Ekta Singh',at);
  assert.equal(waiting.status,'Waiting for Reply');
  assert.throws(()=>updateClarification(waiting,{type:'answer'},'Ekta Singh',at));
  const replied=updateClarification(waiting,{type:'reply',text:' Team leads can escalate. ',id:'reply'},'Priya Mehta',at);
  const answered=updateClarification(replied,{type:'answer',id:'answer'},'Ekta Singh',at);
  const closed=updateClarification(answered,{type:'close',id:'close'},'Ekta Singh',at);
  assert.equal(closed.status,'Closed');assert.equal(closed.replies[0].text,'Team leads can escalate.');assert.equal(closed.replies[0].at,at);
  assert.equal(closed.question,original.question);assert.equal(closed.attachments,original.attachments);assert.equal(original.status,'Needs Clarification');assert.equal(closed.activity.length,5);
});
test('closed requests reject changes and statuses cannot skip forward',()=>{
  const items=createClarifications();
  assert.throws(()=>updateClarification(items[0],{type:'close'},'Ekta Singh'));
  for(const type of ['reply','attach','answer','send','close'])assert.throws(()=>updateClarification(items[3],{type,text:'reply',files:[{name:'file'}]},'Ekta Singh'));
});
test('adding attachments preserves existing files and records author and time',()=>{
  const original=createClarifications()[0];const at='2026-09-25T12:00:00Z';
  const updated=updateClarification(original,{type:'attach',id:'attach',files:[{id:'new',name:'screen.png',url:'data:image/png;base64,AA'}]},'Ekta Singh',at);
  assert.equal(updated.attachments.length,2);assert.equal(original.attachments.length,1);assert.equal(updated.attachments[1].author,'Ekta Singh');assert.equal(updated.attachments[1].at,at);
});
test('reply advances a new question to waiting and rejects blank content',()=>{
  const item=createClarifications()[0];assert.throws(()=>updateClarification(item,{type:'reply',text:'  '},'Ekta Singh'));
  assert.equal(updateClarification(item,{type:'reply',id:'reply',text:'Please confirm the team lead role.'},'Ekta Singh').status,'Waiting for Reply');
});
