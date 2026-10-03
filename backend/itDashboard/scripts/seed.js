import {deleteApp} from 'firebase-admin/app';
import {connect} from '../src/firebase.js';

const args=process.argv.slice(2);
const live=args.includes('--live');
if(args.some(arg=>arg!=='--live'))throw new Error('Only the explicit --live option is supported.');
const emulator=process.env.FIREBASE_PROJECT_ID?.startsWith('demo-')&&Boolean(process.env.FIRESTORE_EMULATOR_HOST);
if(live&&process.env.IT_ALLOW_LIVE_DEMO_SEED!=='true')throw new Error('Live demo data requires IT_ALLOW_LIVE_DEMO_SEED=true.');
if(!live&&!emulator)throw new Error('Demo seed requires a demo-* project and Firestore Emulator; use --live with explicit opt-in for live Firebase.');

const {store,app}=connect();
const day=new Date().toISOString().slice(0,10).replaceAll('-','');
const projectId=`dev-demo-${day}`;
const now=new Date().toISOString();
const demoMember='DEMO-IT-MEMBER';
const records=[
  {path:`itd_projects/${projectId}`,data:{name:'Dev-only sample project',client:'Demo',priority:'High',status:'Active',executionStatus:'In Progress',progress:35,startDate:now.slice(0,10),dueDate:now.slice(0,10),team:[],memberIds:[],devOnly:true,createdAt:now,updatedAt:now}},
  {path:`itd_tasks/TASK-DEMO-${day}-01`,data:{projectId,memberId:demoMember,title:'Review sample project requirements',status:'Pending',dueDate:now.slice(0,10),devOnly:true,createdAt:now}},
  {path:`itd_tasks/TASK-DEMO-${day}-02`,data:{projectId,memberId:demoMember,title:'Validate sample project delivery',status:'In Progress',dueDate:now.slice(0,10),devOnly:true,createdAt:now}},
  {path:`itd_bugs/BUG-DEMO-${day}-01`,data:{id:`BUG-DEMO-${day}-01`,title:'Demo login timeout',projectId,priority:'Critical',status:'Open',assignedTo:demoMember,reportedBy:demoMember,date:now,description:'Dev-only sample bug.',steps:'Open the demo login.',expected:'The demo login completes.',actual:'The demo login times out.',devOnly:true}},
  {path:`itd_bugs/BUG-DEMO-${day}-02`,data:{id:`BUG-DEMO-${day}-02`,title:'Demo layout issue',projectId,priority:'Medium',status:'In Progress',assignedTo:demoMember,reportedBy:demoMember,date:now,description:'Dev-only sample bug.',steps:'Open the demo dashboard.',expected:'The layout fits.',actual:'The sample layout overflows.',devOnly:true}},
  {path:`itd_clarifications/CLR-DEMO-${day}-01`,data:{id:`CLR-DEMO-${day}-01`,subject:'Demo delivery date',question:'Confirm the sample delivery date.',projectId,priority:'High',status:'Needs Clarification',askedBy:demoMember,assignedTo:demoMember,at:now,replyCount:0,devOnly:true}},
  {path:`itd_clarifications/CLR-DEMO-${day}-02`,data:{id:`CLR-DEMO-${day}-02`,subject:'Demo acceptance criteria',question:'Confirm the sample acceptance criteria.',projectId,priority:'Medium',status:'Waiting for Reply',askedBy:demoMember,assignedTo:demoMember,at:now,replyCount:1,devOnly:true}},
  {path:`itd_clarifications/CLR-DEMO-${day}-02/replies/demo-seed-reply`,data:{text:'Dev-only sample reply.',authorId:demoMember,at:now,devOnly:true}},
];

try {
  const current=await Promise.all(records.map(async record=>({record,current:await store.get(record.path)})));
  const conflicts=current.filter(({current})=>current&&!current.devOnly);
  if(conflicts.length)throw new Error(`Refusing to overwrite non-demo records: ${conflicts.map(({record})=>record.path).join(', ')}`);
  const operations=current.filter(({current})=>!current).map(({record})=>({method:'create',...record}));
  if(operations.length)await store.batch(operations);
  console.log(JSON.stringify({devOnly:true,live,projectId,created:operations.length,alreadyPresent:records.length-operations.length,bugs:2,clarifications:2,tasks:2,countersChanged:false},null,2));
} finally {
  await deleteApp(app);
}