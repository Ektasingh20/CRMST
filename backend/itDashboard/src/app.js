import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import multer from 'multer';
import {rateLimit} from 'express-rate-limit';
import {z,ZodError} from 'zod';
import {authentication,authorize,managersOnly} from './auth.js';
import {ReadCache} from './cache.js';
import {createReads} from './reads.js';
import {createMutations} from './mutations.js';
import {createUploads} from './uploads.js';
import {syncProjects} from './sync.js';
import {HttpError,requireThat} from './errors.js';
import * as v from './validation.js';
export function createApp({store,auth,bucket},env=process.env,basePath='/api/it') {
  const app=express();app.disable('x-powered-by');
  const cache=new ReadCache(Math.min(60000,Math.max(0,Number(env.CACHE_TTL_MS)||15000)));
  const reads=createReads(store,cache,Math.min(5000,Number(env.MAX_SCOPE_RECORDS)||5000));
  const mutations=createMutations(store,cache);const uploads=createUploads(bucket,store,mutations);
  const origins=(env.CORS_ORIGINS||'http://localhost:5174').split(',').map(s=>s.trim());
  app.use(helmet());app.use(cors({origin:(origin,done)=>done(origin&&!origins.includes(origin)?new HttpError(403,'Origin not allowed.'):null,true)}));
  app.use(express.json({limit:'64kb'}));
  app.get('/healthz',(req,res)=>res.json({ok:true}));
  app.get(`${basePath}/health`,(req,res)=>res.json({ok:true}));
  const api=express.Router();app.use(basePath||'/',api);
  api.use(authentication(auth,store,cache));
  api.use(rateLimit({windowMs:60000,limit:120,keyGenerator:req=>req.member.id,standardHeaders:'draft-8',legacyHeaders:false,message:{error:'Too many requests.'}}));
  api.use((req,res,next)=>{res.set('Cache-Control','private, no-store');next();});
  const validId=(value)=>v.id.parse(value);
  const page=z.object({limit:z.coerce.number().int().min(1).max(100).default(25),cursor:z.string().max(200).default(''),projectId:v.id.optional(),status:z.string().max(50).optional()}).strict();
  api.get('/dashboard',async(req,res)=>{const {limit}=z.object({limit:z.coerce.number().int().min(1).max(25).default(3)}).strict().parse(req.query);res.json(await reads.dashboard(req.member,limit));});
  api.get('/projects',async(req,res)=>res.json(await reads.list(req.member,'projects',page.parse(req.query))));
  api.get('/projects/:id',async(req,res)=>res.json(v.publicRecord(authorize(req.member,await store.get(`itd_projects/${validId(req.params.id)}`)))));
  api.patch('/projects/:id',async(req,res)=>res.json(await mutations.projectUpdate(req.member,validId(req.params.id),v.projectPatch.parse(req.body))));
  api.put('/projects/:id/team',managersOnly,async(req,res)=>res.json(await mutations.setTeam(req.member,validId(req.params.id),v.team.parse(req.body))));
  api.get('/projects/:id/history',async(req,res)=>{
    const id=validId(req.params.id);authorize(req.member,await store.get(`itd_projects/${id}`));
    const {limit,cursor}=page.parse(req.query);const rows=await store.query('itd_statusHistory',{filters:[['projectId','==',id]],limit:limit+1,after:cursor||undefined});
    res.json({items:rows.slice(0,limit).map(v.publicRecord),nextCursor:rows.length>limit?rows[limit-1].id:null});
  });
  api.get('/tasks',async(req,res)=>res.json(await reads.list(req.member,'tasks',page.parse(req.query))));
  api.post('/tasks',managersOnly,async(req,res)=>res.status(201).json(await mutations.taskCreate(req.member,v.taskCreate.parse(req.body))));
  api.patch('/tasks/:id',async(req,res)=>{const {status}=z.object({status:v.taskStatus}).strict().parse(req.body);res.json(await mutations.taskUpdate(req.member,validId(req.params.id),status));});
  const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:5*1024*1024,files:1,fields:0,parts:2}}).single('file');
  const uploadLimit=rateLimit({windowMs:60000,limit:10,keyGenerator:req=>req.member.id,message:{error:'Too many uploads.'}});
  for(const kind of ['bugs','clarifications']) {
    const createSchema=kind==='bugs'?v.bugCreate:v.clarificationCreate;
    const patchSchema=kind==='bugs'?v.bugPatch:v.clarificationPatch;
    const messages=kind==='bugs'?'comments':'replies';
    api.get(`/${kind}`,async(req,res)=>res.json(await reads.list(req.member,kind,page.parse(req.query))));
    api.post(`/${kind}`,async(req,res)=>res.status(201).json(await mutations.ticketCreate(req.member,kind,createSchema.parse(req.body))));
    api.get(`/${kind}/:id`,async(req,res)=>{const row=await store.get(`itd_${kind}/${validId(req.params.id)}`);requireThat(row,404,'Ticket not found.');authorize(req.member,await store.get(`itd_projects/${row.projectId}`));res.json(v.publicRecord(row));});
    api.patch(`/${kind}/:id`,async(req,res)=>res.json(await mutations.ticketUpdate(req.member,kind,validId(req.params.id),patchSchema.parse(req.body))));
    api.post(`/${kind}/:id/${messages}`,async(req,res)=>res.status(201).json(await mutations.comment(req.member,kind,validId(req.params.id),v.message.parse(req.body).text)));
    for(const child of [messages,'activity','attachments']) api.get(`/${kind}/:id/${child}`,async(req,res)=>{
      const id=validId(req.params.id),ticket=await store.get(`itd_${kind}/${id}`);requireThat(ticket,404,'Ticket not found.');authorize(req.member,await store.get(`itd_projects/${ticket.projectId}`));
      const {limit,cursor}=page.parse(req.query);const rows=await store.query(`itd_${kind}/${id}/${child}`,{limit:limit+1,after:cursor||undefined});
      res.json({items:rows.slice(0,limit).map(v.publicRecord),nextCursor:rows.length>limit?rows[limit-1].id:null});
    });
    api.post(`/${kind}/:id/attachments`,uploadLimit,upload,async(req,res)=>res.status(201).json(await uploads.attach(req.member,kind,validId(req.params.id),req.file)));
    api.get(`/${kind}/:id/attachments/:attachmentId/download`,async(req,res)=>{
      const {metadata,stream}=await uploads.download(req.member,kind,validId(req.params.id),validId(req.params.attachmentId));
      res.type(metadata.type);res.attachment(metadata.name);stream.on('error',error=>{if(!res.headersSent)res.status(502).json({error:'Unable to read attachment.'});else res.destroy(error);});stream.pipe(res);
    });
  }
  api.get('/team/members',managersOnly,async(req,res)=>res.json({items:await reads.members()}));
  api.get('/team/overview',managersOnly,async(req,res)=>res.json(await reads.teamOverview(req.member)));
  api.post('/clarifications/:id/actions',async(req,res)=>{
    const body=z.object({type:z.enum(['reply','send','answer','close']),text:z.string().trim().min(1).max(5000).optional()}).strict().parse(req.body);
    if(body.type!=='close'&&!body.text)throw new HttpError(400,'Text is required for this action.');
    res.json(await mutations.clarificationAction(req.member,validId(req.params.id),body));
  });
  api.post('/sync',managersOnly,async(req,res)=>{
    const {dryRun}=z.object({dryRun:z.boolean().default(true)}).strict().parse(req.body||{});
    try {res.json(await syncProjects(store,{dryRun,cooldownMs:Number(env.SYNC_COOLDOWN_MS)||300000,owner:req.member.id}));}finally{cache.clear();}
  });
  app.use((req,res)=>res.status(404).json({error:'Endpoint not found.'}));
  app.use((error,req,res,next)=>{
    if(res.headersSent)return next(error);
    let status=error.status||500,message=error.message;
    if(error instanceof ZodError){status=400;message=error.issues.map(i=>`${i.path.join('.')||'body'}: ${i.message}`).join('; ');}
    else if(error instanceof multer.MulterError){status=error.code==='LIMIT_FILE_SIZE'?413:400;message=error.code==='LIMIT_FILE_SIZE'?'Files must be 5 MB or smaller.':'Upload one file in the file field.';}
    if(status>=500){console.error('IT API request failed:',error.code || error.name);message='Internal service error.';}
    res.status(status).json({error:message});
  });
  return app;
}
