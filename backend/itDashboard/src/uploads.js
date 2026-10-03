import {randomUUID} from 'node:crypto';
import { requireThat } from './errors.js';
import { ticketActivity,nowISO } from './domain.js';
import { authorize } from './auth.js';
const signatures={
  'application/pdf':buffer=>buffer.subarray(0,5).toString()==='%PDF-',
  'image/png':buffer=>buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),
  'image/jpeg':buffer=>buffer.length>=3&&buffer[0]===255&&buffer[1]===216&&buffer[2]===255,
};
export function validateUpload(file) {
  requireThat(file?.buffer?.length>0,400,'A file is required.');
  requireThat(file.buffer.length<=5*1024*1024,413,'Files must be 5 MB or smaller.');
  requireThat(signatures[file.mimetype]?.(file.buffer),400,'Only valid PDF, PNG, or JPG files are accepted.');
  return {name:file.originalname.replace(/[^a-zA-Z0-9._ -]/g,'_').slice(0,150)||'attachment',type:file.mimetype,size:file.buffer.length};
}
export function createUploads(bucket,store,mutations) {
  function fileAt(path) {
    requireThat(/^it-dashboard\/(bugs|clarifications)\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(path),400,'Storage path is outside the IT attachment namespace.');
    return bucket.file(path);
  }
  async function attach(member,kind,id,file) {
    const metadata=validateUpload(file);
    const ticket=await store.get(`itd_${kind}/${id}`);requireThat(ticket,404,'Ticket not found.');
    authorize(member,await store.get(`itd_projects/${ticket.projectId}`));
    requireThat(kind!=='clarifications'||ticket.status!=='Closed',409,'Closed clarifications are read-only.');
    const attachmentId=randomUUID(),objectPath=`it-dashboard/${kind}/${id}/${attachmentId}`;
    const object=fileAt(objectPath);
    await object.save(file.buffer,{resumable:false,validation:'crc32c',preconditionOpts:{ifGenerationMatch:0},metadata:{contentType:metadata.type,cacheControl:'private, no-store'}});
    try {
      return await mutations.commit(async tx=>{
        const current=await mutations.ticket(tx,member,kind,id);
        const record={...metadata,objectPath,authorId:member.id,at:nowISO()};
        tx.create(`itd_${kind}/${id}/attachments/${attachmentId}`,record);
        ticketActivity(tx,kind,current,member.id,`Attachment added to ${id}`);
        return {id:attachmentId,...record};
      });
    } catch(error) {
      try {await object.delete({ignoreNotFound:true});} catch {console.error('Attachment cleanup required:',objectPath);}
      throw error;
    }
  }
  async function download(member,kind,id,attachmentId) {
    const ticket=await store.get(`itd_${kind}/${id}`);requireThat(ticket,404,'Ticket not found.');
    authorize(member,await store.get(`itd_projects/${ticket.projectId}`));
    const attachment=await store.get(`itd_${kind}/${id}/attachments/${attachmentId}`);requireThat(attachment,404,'Attachment not found.');
    requireThat(attachment.objectPath===`it-dashboard/${kind}/${id}/${attachmentId}`,400,'Invalid attachment path.');
    return {metadata:attachment,stream:fileAt(attachment.objectPath).createReadStream()};
  }
  return {attach,download};
}
