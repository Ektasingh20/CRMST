import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import {getFirestore} from 'firebase-admin/firestore';
import {deleteApp} from 'firebase-admin/app';
import {connect} from '../src/firebase.js';
import {createApp} from '../src/app.js';
import {syncProjects,projectIdFor} from '../src/sync.js';
import {workload} from '../src/domain.js';
import {ReadCache} from '../src/cache.js';
import {validateUpload} from '../src/uploads.js';
import {createReads} from '../src/reads.js';

for(const key of ['FIRESTORE_EMULATOR_HOST','FIREBASE_AUTH_EMULATOR_HOST','FIREBASE_STORAGE_EMULATOR_HOST'])assert.match(process.env[key]||'',/^(127\.0\.0\.1|localhost):\d+$/,'Refusing tests without loopback emulators');
assert.equal(process.env.FIREBASE_PROJECT_ID,'demo-it-dashboard','Never test on a live project');
let deps,db,server,url;const tokens={};const legacyPaths=['Project/employee','Project/employee/source-1/Project Data','users/it/members/it_01','tasks/legacy','attendance/legacy','leaves/legacy','notifications/legacy'];let legacyBefore;
const project={name:'Emulator project',client:'Fictional',priority:'High',status:'Active',executionStatus:'In Progress',progress:20,startDate:'2026-01-01',dueDate:'2099-01-01',team:[{memberId:'employee',role:'Developer'}],memberIds:['employee'],sourcePath:null};
async function request(method,path,body,who='manager') {
 const headers=who?{Authorization:`Bearer ${tokens[who]||who}`} : {};
 const options={method,headers};if(body instanceof FormData) options.body=body;else if(body!==undefined){headers['Content-Type']='application/json';options.body=JSON.stringify(body);}
 const response=await fetch(url+'/api/it'+path,options);let data;const type=response.headers.get('content-type')||'';if(type.includes('json'))data=await response.json();else data=await response.text();return {status:response.status,data};
}
async function fixture(id='p1'){await deps.store.set(`itd_projects/${id}`,project);}
async function createClar(){return (await request('POST','/clarifications',{subject:'Question',question:'Which deadline?',projectId:'p1',priority:'Medium',assignedTo:'employee'})).data;}
function upload(bytes='%PDF-1.4\nSample fixture',type='application/pdf',name='sample.pdf'){const form=new FormData();form.append('file',new Blob([bytes],{type}),name);return form;}
before(async()=>{
 await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/demo-it-dashboard/databases/(default)/documents`,{method:'DELETE'});
 deps=connect();db=getFirestore(deps.app);
 for(const [uid,appRole] of [['manager','Project Manager'],['employee','IT Employee'],['outsider','IT Employee']]){
  await deps.auth.createUser({uid,email:`${uid}@example.test`,password:'EmulatorOnly123!'});
  const response=await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-key`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:`${uid}@example.test`,password:'EmulatorOnly123!',returnSecureToken:true})});tokens[uid]=(await response.json()).idToken;
  await deps.store.set(`itd_members/${uid}`,{userId:uid==='employee'?'it_01':uid,userPath:`users/it/members/${uid==='employee'?'it_01':uid}`,teamRole:'Developer',appRole,onLeave:false,name:uid});
 }
 // Raw SDK writes are limited to emulator fixture setup, never used by application code.
 for(const path of legacyPaths)await db.doc(path).set(path==='Project/employee'?{assignedEmployeeId:'it_01',assignedEmployeeName:'Fictional employee'}:path.includes('Project Data')?{projectName:'Legacy sample',client:'Sample',priority:'Medium',status:'Active',startDate:'2026-01-01',expectedDelivery:'2026-12-01',tasks:[{id:'embedded',title:'Imported task',status:'Pending',assignedTo:'it_01'}]}:{name:'Sentinel',id:'it_01',unchanged:true});
 legacyBefore=await Promise.all(legacyPaths.map(async p=>(await db.doc(p).get()).data()));
 await fixture();
 server=createApp(deps,{CACHE_TTL_MS:'15000',CORS_ORIGINS:'http://localhost:5174'}).listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));url=`http://127.0.0.1:${server.address().port}`;
});
after(async()=>{const after=await Promise.all(legacyPaths.map(async p=>(await db.doc(p).get()).data()));assert.deepEqual(after,legacyBefore,'All legacy documents must remain identical');await new Promise(resolve=>server.close(resolve));await deleteApp(deps.app);});

test('write guard blocks all direct, batch and transaction writes to existing data',async()=>{
 for(const path of legacyPaths){for(const method of ['set','create','update','delete'])await assert.rejects(deps.store[method](path,{bad:true}),/Write forbidden/);await assert.rejects(deps.store.batch([{method:'set',path,data:{bad:true}}]),/Write forbidden/);await assert.rejects(deps.store.transaction(tx=>{tx.update(path,{bad:true});}),/Write forbidden/);}
 for(const method of ['set','update','delete','create','batch','transaction'])assert.throws(()=>deps.store.source[method]('users/x',{}),/read-only/);
 const record=await deps.store.source.get('Project/employee');assert.equal(record.ref,undefined);assert.equal(record._ref,undefined);
 assert.deepEqual(await deps.store.source.describeDocument('Project/employee/source-1/Project Data'),{projectName:'string',client:'string',priority:'string',status:'string',startDate:'string',expectedDelivery:'string',tasks:'array'});
 await assert.rejects(deps.store.set('itd_unknown/x',{}),/Write forbidden/);
});
test('Firebase authentication and server-owned manager role',async()=>{
 const health=await request('GET','/health',undefined,null);assert.deepEqual(health,{status:200,data:{ok:true}});
 assert.equal((await request('GET','/dashboard',undefined,null)).status,401);
 assert.equal((await request('GET','/dashboard',undefined,'fake-jwt')).status,401);
 assert.equal((await request('GET','/team/overview',undefined,'employee')).status,403);
 assert.equal((await request('PUT','/projects/p1/team',{team:[]},'employee')).status,403);
 assert.equal((await request('GET','/projects/p1',undefined,'outsider')).status,403);
 assert.equal((await request('POST','/sync',{},'employee')).status,403);
});
test('sync defaults to dry-run and creates no documents',async()=>{
 const report=await syncProjects(deps.store);assert.equal(report.dryRun,true);assert.equal(report.created,1);assert.equal(await deps.store.get('itd_projects/'+projectIdFor(legacyPaths[1])),null);
});
test('sync is repeatable, restores mapped fields and preserves local progress',async()=>{
 const first=await syncProjects(deps.store,{dryRun:false,cooldownMs:0});assert.equal(first.created,1);
 const id=projectIdFor(legacyPaths[1]);const p=await deps.store.get(`itd_projects/${id}`);assert.equal(p.name,'Legacy sample');assert.equal(p.sourcePath,legacyPaths[1]);assert.deepEqual(p.memberIds,['employee']);
 assert.equal(id,'source-1');assert.ok(p.syncedAt);assert.equal(p.projectName,'Legacy sample');assert.equal(p.tasks[0].title,'Imported task');
 await deps.store.update(`itd_projects/${id}`,{progress:75,completionRemarks:'Local note'});
 const again=await syncProjects(deps.store,{dryRun:false,cooldownMs:0});assert.equal(again.unchanged,1);assert.equal((await deps.store.get(`itd_projects/${id}`)).progress,75);
 const imported=await deps.store.query('itd_tasks',{filters:[['projectId','==',id]]});assert.equal(imported.length,1);
 await assert.rejects(syncProjects(deps.store,{dryRun:false}),/cooldown/);
});
test('accept/reject and validation reject client role injection',async()=>{
 await deps.store.set('itd_projects/new',{...project,status:'New'});
 assert.equal((await request('PATCH','/projects/new',{action:'accept'})).status,200);
 assert.equal((await request('PATCH','/projects/new',{action:'reject'})).status,409);
 const invalid=await request('PATCH','/projects/new',{progress:10,appRole:'Project Manager'});assert.equal(invalid.status,400);assert.equal(typeof invalid.data.error,'string');
});
test('completion requires real date and remarks, atomically completes tasks',async()=>{
 const task=await request('POST','/tasks',{projectId:'p1',memberId:'employee',title:'Complete implementation',dueDate:'2020-01-01'});assert.equal(task.status,201);
 assert.equal((await request('PATCH','/projects/p1',{status:'Completed',completionDate:'2026-02-30',remarks:'Done'})).status,400);
 assert.equal((await request('PATCH','/projects/p1',{status:'Completed'})).status,400);
 const done=await request('PATCH','/projects/p1',{status:'Completed',completionDate:'2026-10-01',remarks:'Accepted'});assert.equal(done.status,200);assert.equal(done.data.progress,100);
 assert.equal((await deps.store.get(`itd_tasks/${task.data.id}`)).status,'Done');
 assert.equal((await request('PATCH',`/tasks/${task.data.id}`,{status:'Pending'})).status,409);
 await request('PATCH','/projects/p1',{status:'Active',progress:50,remarks:'Reopened'});
});
test('task ownership, completion timestamp and invalid calendar dates',async()=>{
 const t=await request('POST','/tasks',{projectId:'p1',memberId:'employee',title:'Task',dueDate:'2099-01-01'});
 assert.equal((await request('PATCH',`/tasks/${t.data.id}`,{status:'Done'},'outsider')).status,403);
 const done=await request('PATCH',`/tasks/${t.data.id}`,{status:'Done'},'employee');assert.equal(done.status,200);assert.ok(done.data.completedAt);
 assert.equal((await request('POST','/tasks',{projectId:'p1',memberId:'employee',title:'Invalid date',dueDate:'2026-13-40'})).status,400);
});
test('concurrent ticket creation allocates distinct sequential counter IDs',async()=>{
 const body={title:'Bug',projectId:'p1',priority:'Critical',assignedTo:'employee',description:'Repro'};
 const results=await Promise.all(Array.from({length:6},()=>request('POST','/bugs',body,'employee')));
 for(const r of results)assert.equal(r.status,201,JSON.stringify(r.data));
 const ids=results.map(r=>r.data.id);assert.equal(new Set(ids).size,6);assert.ok(ids.includes('BUG-1043'));
 assert.equal((await deps.store.get('itd_counters/bugs')).value,1048);
 assert.equal((await request('POST','/bugs',{...body,assignedTo:'outsider'})).status,400);
});
test('clarification transitions require a reply and Closed is immutable',async()=>{
 const c=await createClar();assert.equal(c.id,'CLR-109');
 assert.equal((await request('PATCH',`/clarifications/${c.id}`,{status:'Answered'})).status,409);
 assert.equal((await request('PATCH',`/clarifications/${c.id}`,{status:'Waiting for Reply'})).status,200);
 assert.equal((await request('PATCH',`/clarifications/${c.id}`,{status:'Answered'})).status,409);
 assert.equal((await request('POST',`/clarifications/${c.id}/replies`,{text:'Confirmed'},'employee')).status,201);
 assert.equal((await request('PATCH',`/clarifications/${c.id}`,{status:'Answered'})).status,200);
 assert.equal((await request('PATCH',`/clarifications/${c.id}`,{status:'Closed'})).status,200);
 for(const [method,path,body] of [['PATCH',`/clarifications/${c.id}`,{subject:'Edit'}],['POST',`/clarifications/${c.id}/replies`,{text:'Edit'}],['POST',`/clarifications/${c.id}/attachments`,upload()]])assert.equal((await request(method,path,body)).status,409);
});
test('clarification actions enforce send, reply, answer and close order',async()=>{
 const c=await createClar();
 assert.equal((await request('POST',`/clarifications/${c.id}/actions`,{type:'answer',text:'Premature'})).status,409);
 assert.equal((await request('POST',`/clarifications/${c.id}/actions`,{type:'send',text:'Please confirm.'})).data.status,'Waiting for Reply');
 assert.equal((await request('POST',`/clarifications/${c.id}/actions`,{type:'reply',text:'Confirmed.'},'employee')).status,200);
 assert.equal((await request('POST',`/clarifications/${c.id}/actions`,{type:'answer',text:'Thanks.'})).data.status,'Answered');
 assert.equal((await request('POST',`/clarifications/${c.id}/actions`,{type:'close'})).data.status,'Closed');
 assert.equal((await request('POST',`/clarifications/${c.id}/actions`,{type:'reply',text:'Too late.'})).status,409);
});
test('attachment upload uses IT namespace and authenticated downloads',async()=>{
 const c=await createClar();const result=await request('POST',`/clarifications/${c.id}/attachments`,upload(),'employee');assert.equal(result.status,201,JSON.stringify(result.data));assert.match(result.data.objectPath,/^it-dashboard\/clarifications\//);
 const path=`/clarifications/${c.id}/attachments/${result.data.id}/download`;
 const fetched=await request('GET',path,undefined,'employee');assert.equal(fetched.status,200);assert.match(fetched.data,/^%PDF-/);
 assert.equal((await request('GET',path,undefined,'outsider')).status,403);
 assert.equal((await request('POST',`/clarifications/${c.id}/attachments`,upload('not PDF'))).status,400);
 assert.equal((await request('POST',`/clarifications/${c.id}/attachments`,upload(new Uint8Array(5*1024*1024+1)))).status,413);
 assert.throws(()=>validateUpload({buffer:Buffer.from('bad'),mimetype:'text/html',originalname:'x.html'}));
});
test('dashboard totals, deduplication, pagination and bounded repeat reads',async()=>{
 await request('POST','/tasks',{projectId:'p1',memberId:'employee',title:'Late',dueDate:'2020-01-01'});
 await request('POST','/tasks',{projectId:'p1',memberId:'employee',title:'Upcoming',dueDate:'2099-01-01'});
 const first=await request('GET','/dashboard?limit=3',undefined,'employee');assert.equal(first.status,200,JSON.stringify(first.data));assert.ok(first.data.stats.overdueTasks>0);assert.ok(first.data.stats.criticalBugs>=6);
 assert.ok(first.data.myWork.items.every(t=>!first.data.attention.items.some(a=>a.kind==='task'&&a.id===t.id)));
 assert.ok(first.data.myWork.items.length<=3);assert.ok(first.data.activity.total>=first.data.activity.items.length);
 const before=deps.store.readCount();await Promise.all([request('GET','/dashboard?limit=3',undefined,'employee'),request('GET','/dashboard?limit=3',undefined,'employee')]);assert.equal(deps.store.readCount(),before,'Warm dashboard should issue no Firestore reads');
 const page=await request('GET','/bugs?limit=2');assert.equal(page.data.items.length,2);assert.ok(page.data.nextCursor);
 const next=await request('GET','/bugs?limit=2&cursor='+page.data.nextCursor);assert.ok(next.data.items.every(b=>!page.data.items.some(a=>a.id===b.id)));
 const empty=await request('GET','/dashboard',undefined,'outsider');assert.equal(empty.data.projects.total,0);assert.equal(empty.data.stats.openBugs,0);
});
test('team update unassigns removed members tasks and limits manager access',async()=>{
 const result=await request('PUT','/projects/p1/team',{team:[]});assert.equal(result.status,200);
 const tasks=await deps.store.query('itd_tasks',{filters:[['projectId','==','p1']]});assert.ok(tasks.every(t=>t.memberId===null));
 assert.equal((await request('GET','/projects/p1',undefined,'employee')).status,403);
 await request('PUT','/projects/p1/team',{team:[{memberId:'employee',role:'Developer'}]});
});
test('workload matches fractional project sharing and is not capped at 100%',()=>{
 const result=workload('a',[{priority:'Critical',status:'Active',team:[{memberId:'a'},{memberId:'b'}]}],[{assignedTo:'a',priority:'Critical',status:'Open'},{assignedTo:'a',priority:'High',status:'Resolved'}]);assert.equal(result.projectPoints,4);assert.equal(result.bugPoints,5);assert.equal(result.workload,45);
 assert.equal(workload('a',[],Array.from({length:5},()=>({assignedTo:'a',priority:'Critical',status:'Open'}))).workload,125);
});
test('cache coalesces concurrent reads and retries failed loaders',async()=>{
 const cache=new ReadCache();let calls=0;const load=async()=>{calls++;await new Promise(r=>setTimeout(r,10));return {a:1};};await Promise.all([cache.get('x',load),cache.get('x',load)]);assert.equal(calls,1);cache.clear();await cache.get('x',load);assert.equal(calls,2);
 await assert.rejects(cache.get('bad',async()=>{throw Error('fail')}));assert.equal(await cache.get('bad',async()=>42),42);
});
test('over-limit completion refuses partial writes',async()=>{
 await fixture('large');await deps.store.batch(Array.from({length:401},(_,i)=>({method:'set',path:`itd_tasks/large-${i}`,data:{projectId:'large',memberId:'employee',title:'Large fixture',status:'Pending'}})));
 const result=await request('PATCH','/projects/large',{status:'Completed',completionDate:'2026-10-01',remarks:'Complete'});assert.equal(result.status,409);assert.equal((await deps.store.get('itd_projects/large')).status,'Active');assert.equal((await deps.store.get('itd_tasks/large-0')).status,'Pending');
});
test('fresh authorization blocks revoked manager writes despite a cached GET',async()=>{
 await request('GET','/team/overview');await deps.store.update('itd_members/manager',{appRole:'IT Employee'});
 assert.equal((await request('PUT','/projects/p1/team',{team:[]})).status,403);
 await deps.store.update('itd_members/manager',{appRole:'Project Manager'});
});

test('source refresh updates descriptive fields without reverting local state',async()=>{
 const path=legacyPaths[1],original=(await db.doc(path).get()).data(),id=projectIdFor(path);
 try {
  await db.doc(path).update({projectName:'Refreshed source',status:'Completed',statusRemarks:'Source completion'});
  const result=await syncProjects(deps.store,{dryRun:false,cooldownMs:0});assert.equal(result.updated,1);
  const p=await deps.store.get(`itd_projects/${id}`);assert.equal(p.name,'Refreshed source');assert.equal(p.progress,75);assert.equal(p.status,'Active');assert.equal(p.completionRemarks,'Local note');
 }finally{await db.doc(path).set(original);}
});
test('summary list avoids attachment payloads and reads only its own kind',async()=>{
 const cache=new ReadCache();const reads=createReads(deps.store,cache);
 await deps.store.update('itd_projects/p1',{documents:[{name:'large.pdf',url:'https://example.test/sample.pdf'}]});
 const member=await deps.store.get('itd_members/manager');const count=deps.store.readCount();
 const projects=await reads.list(member,'projects',{limit:10});assert.ok(projects.items.every(p=>p.documents===undefined));
 assert.equal(deps.store.readCount()-count,projects.total,'Project list should not read tasks, bugs or clarifications');
});
test('sync HTTP defaults to dry-run and rejects client-controlled options',async()=>{
 const result=await request('POST','/sync',{});assert.equal(result.status,200);assert.equal(result.data.dryRun,true);
 assert.equal((await request('POST','/sync',{dryRun:true,collection:'users'})).status,400);
});
test('wrapper rejects path escape and unapproved collection names',async()=>{
 for(const path of ['users/x','itd_projects/../users/x','itd_projects//x','/itd_projects/x','itd_projects/x/','itd_evil/x'])await assert.rejects(deps.store.set(path,{bad:true}));
});
