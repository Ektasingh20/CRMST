import {writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {deleteApp} from 'firebase-admin/app';
import {connect} from '../src/firebase.js';

const {store,app}=connect();
const parents=[];
let after;
try {
  do {
    const page=await store.source.query('Project',{limit:200,after});
    parents.push(...page);
    after=page.length===200?page.at(-1).id:undefined;
  } while(after);

  const documents=[];
  for(const parent of parents) {
    const subcollections=await store.source.projectCollections(parent.path);
    const projects=[];
    for(const projectId of subcollections) {
      const collectionPath=`${parent.path}/${projectId}`;
      const projectDataPath=`${collectionPath}/Project Data`;
      projects.push({
        projectId,
        collectionPath,
        projectDataPath,
        projectDataFields:await store.source.describeDocument(projectDataPath),
      });
    }
    documents.push({
      employeeKey:parent.id,
      documentPath:parent.path,
      fields:await store.source.describeDocument(parent.path),
      subcollections:projects,
    });
  }

  const output={collection:'Project',documents};
  const outputPath=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..','discovery.json');
  await writeFile(outputPath,`${JSON.stringify(output,null,2)}\n`);
  console.log(JSON.stringify(output,null,2));
  console.log(`Saved ${documents.length} Project documents to ${outputPath}`);
} finally {
  await deleteApp(app);
}