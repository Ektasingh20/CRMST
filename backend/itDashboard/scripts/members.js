import fs from 'node:fs/promises';
import {z} from 'zod';
import {deleteApp} from 'firebase-admin/app';
import {connect} from '../src/firebase.js';
import {id} from '../src/validation.js';
const args=process.argv.slice(2),file=args.find(a=>!a.startsWith('--'));
if(!file || args.some(a=>a.startsWith('--')&&!['--apply','--dry-run'].includes(a)))throw new Error('Usage: npm run members:import -- members.local.json [--apply]');
const bindings=z.array(z.object({uid:id,userId:id,userPath:z.string().regex(/^users\/[^/]+\/members\/[^/]+$/),teamRole:z.enum(['Lead','Developer','Tester','Designer']),appRole:z.enum(['IT Employee','Project Manager']),onLeave:z.boolean().default(false)}).strict()).max(400).parse(JSON.parse(await fs.readFile(file,'utf8')));
if(new Set(bindings.map(b=>b.uid)).size!==bindings.length||new Set(bindings.map(b=>b.userPath)).size!==bindings.length)throw new Error('Duplicate UID or user binding.');
const {app,store}=connect();
try {
 const ops=[];
 for(const binding of bindings){
  const user=await store.source.get(binding.userPath);
  if(!user||String(user.id)!==binding.userId)throw new Error('Existing user path/id does not match binding.');
  const existing=await store.get(`itd_members/${binding.uid}`);
  if(existing&&existing.userPath!==binding.userPath)throw new Error('UID already linked to a different user.');
  const {uid,...data}=binding;
  ops.push({method:'set',path:`itd_members/${uid}`,data:{...data,name:user.name||user.username||'IT Member',disabled:false}});
 }
 if(args.includes('--apply')&&!args.includes('--dry-run'))await store.batch(ops);
 console.log(JSON.stringify({dryRun:!args.includes('--apply')||args.includes('--dry-run'),members:ops.length}));
}finally{await deleteApp(app);}
