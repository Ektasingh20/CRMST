import {connect} from '../src/firebase.js';
import {deleteApp} from 'firebase-admin/app';
const {store,app}=connect();
const shape=value=>Array.isArray(value)?'array':value===null?'null':typeof value;
const fields=record=>Object.fromEntries(Object.entries(record).filter(([k])=>!['path','id'].includes(k)).map(([k,v])=>[k,shape(v)]));
try {
 for(const path of ['Project','users/it/members','tasks','attendance','leaves','notifications']) {
  const rows=await store.source.query(path,{limit:2});
  console.log(JSON.stringify({collection:path,sampled:rows.length,fields:rows.map(fields)}));
  if(path==='Project')for(const parent of rows)for(const collection of (await store.source.projectCollections(parent.path)).slice(0,2)){
    const p=await store.source.get(`${parent.path}/${collection}/Project Data`);
    console.log(JSON.stringify({pattern:'Project/{employeeKey}/{projectId}/Project Data',fields:p?fields(p):null}));
  }
 }
}finally {await deleteApp(app);}
