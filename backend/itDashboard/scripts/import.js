import {connect} from '../src/firebase.js';
import {syncProjects} from '../src/sync.js';
import {deleteApp} from 'firebase-admin/app';
const apply=process.argv.includes('--apply');
if(process.argv.slice(2).some(a=>!['--apply','--dry-run'].includes(a)))throw new Error('Use --dry-run (default) or --apply.');
if(apply&&process.argv.includes('--dry-run'))throw new Error('Choose dry-run or apply.');
const {store,app}=connect();
try {console.log(JSON.stringify(await syncProjects(store,{dryRun:!apply}),null,2));}finally{await deleteApp(app);}
