import {spawnSync} from 'node:child_process';
import {mkdirSync,readdirSync,existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const cache=path.join(root,'.cache');mkdirSync(cache,{recursive:true});
const temp=path.join(cache,'tmp');mkdirSync(temp,{recursive:true});
const env={...process.env,TMP:temp,TEMP:temp,TMPDIR:temp,NODE_ENV:'test',FIREBASE_PROJECT_ID:'demo-it-dashboard',GCLOUD_PROJECT:'demo-it-dashboard',GOOGLE_CLOUD_PROJECT:'demo-it-dashboard',FIREBASE_STORAGE_BUCKET:'demo-it-dashboard.appspot.com',FIRESTORE_EMULATOR_HOST:'127.0.0.1:8180',FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9199',FIREBASE_STORAGE_EMULATOR_HOST:'127.0.0.1:9299',ALLOW_LIVE_FIREBASE:'false',FIREBASE_EMULATORS_PATH:path.join(cache,'emulators'),XDG_CONFIG_HOME:path.join(cache,'config'),XDG_CACHE_HOME:cache,CI:'true',FIREBASE_CLI_DISABLE_UPDATE_CHECK:'true',NO_UPDATE_NOTIFIER:'1'};
for(const key of ['GOOGLE_APPLICATION_CREDENTIALS','FIREBASE_TOKEN','FIREBASE_SERVICE_ACCOUNT_BASE64','FIREBASE_CONFIG','FIREBASE_DATABASE_ID'])delete env[key];
const javaRoot=path.join(root,'.runtime','java');
if(existsSync(javaRoot)) {const installed=readdirSync(javaRoot).find(name=>existsSync(path.join(javaRoot,name,'bin',process.platform==='win32'?'java.exe':'java')));if(installed)env.PATH=path.join(javaRoot,installed,'bin')+path.delimiter+env.PATH;}
const testCommand=`"${process.execPath}" --test --test-concurrency=1 test/integration.test.js`;
const result=spawnSync(process.execPath,[path.join(root,'node_modules/firebase-tools/lib/bin/firebase.js'),'emulators:exec','--config','firebase.emulator.json','--project','demo-it-dashboard','--only','auth,firestore,storage',testCommand],{cwd:root,env,stdio:'inherit'});
if(result.error)console.error(result.error.message);
process.exit(result.status??1);
