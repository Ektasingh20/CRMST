import { requireThat } from './errors.js';
export const manager = member => member.appRole === 'Project Manager';
export function canAccess(member, project) { return manager(member) || (project.memberIds || []).includes(member.id); }
export function authorize(member, project) {
  requireThat(project,404,'Project not found.');
  requireThat(canAccess(member,project),403,'Project access denied.');
  return project;
}
export async function membership(store, uid) {
  const member = await store.get(`itd_members/${uid}`);
  requireThat(member && member.disabled !== true && ['IT Employee','Project Manager'].includes(member.appRole),403,'IT membership required.');
  return member;
}
export function authentication(auth, store, cache) {
  return async (req,res,next) => {
    try {
      const match = /^Bearer ([^ ]+)$/.exec(req.headers.authorization || '');
      requireThat(match,401,'Firebase ID token required.');
      let token;
      try { token = await auth.verifyIdToken(match[1]); } catch { requireThat(false,401,'Invalid or expired Firebase ID token.'); }
      requireThat(typeof token.uid === 'string' && /^[A-Za-z0-9_.-]{1,128}$/.test(token.uid),401,'Unsupported Firebase UID.');
      // Mutations always fetch current authorization; GETs have a short bounded cache.
      req.member = req.method === 'GET' ? await cache.get(`member:${token.uid}`,()=>membership(store,token.uid)) : await membership(store,token.uid);
      next();
    } catch(error) { next(error); }
  };
}
export const managersOnly = (req,res,next) => { try { requireThat(manager(req.member),403,'Project Manager access required.'); next(); } catch(error) { next(error); } };
