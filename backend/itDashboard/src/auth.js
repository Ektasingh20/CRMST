import { requireThat } from './errors.js';
import jwt from 'jsonwebtoken';
import User from '../../models/User.js';
import { ensureITWorkspaceMembership, workspaceAppRole } from '../../services/itWorkspaceMembership.js';
const crmUsers = new Map();
const CRM_USER_CACHE_TTL_MS = 5 * 60 * 1000;
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
async function crmMembership(store, user) {
  const uid = String(user.firebaseAuthUid || user._id || user.id || '');
  let linked;
  try {
    linked = await membership(store, uid);
  } catch (error) {
    if (error.status !== 403) throw error;
    const crmId = String(user._id || user.id || '');
    if (!crmId) throw error;
    const matches = crmId === uid ? [] : await store.query('itd_members', { filters: [['userId', '==', crmId]], limit: 2 });
    linked = matches.find(member => member.disabled !== true && ['IT Employee','Project Manager'].includes(member.appRole));
  }
  // Existing profiles can already have a valid membership with the wrong
  // workspace role. Reconcile only on mismatch; the normal path stays one read.
  if (!linked || linked.appRole !== workspaceAppRole(user)) linked = await ensureITWorkspaceMembership(user);
  requireThat(linked,403,'IT account is not linked to an active IT workspace membership.');
  requireThat(linked.disabled !== true && ['IT Employee','Project Manager'].includes(linked.appRole),403,'IT account is not linked to an active IT workspace membership.');
  return linked;
}
export function authentication(auth, store, cache) {
  return async (req,res,next) => {
    try {
      const match = /^Bearer ([^ ]+)$/.exec(req.headers.authorization || '');
      requireThat(match,401,'Authentication token required.');
      let uid;
      let crmUser;
      try {
        uid = (await auth.verifyIdToken(match[1])).uid;
      } catch {
        // CRM login issues a signed app JWT. Resolve it to the Firebase UID
        // used by IT membership records so IT users can share the CRM session.
        let claims;
        try { claims = jwt.verify(match[1], process.env.JWT_SECRET || 'crmst-secret'); }
        catch { requireThat(false,401,'Invalid or expired authentication token.'); }
        requireThat(typeof claims.uid === 'string' && /^[A-Za-z0-9_.-]{1,128}$/.test(claims.uid),401,'Unsupported user ID.');
        let cachedUser = crmUsers.get(claims.uid);
        if (!cachedUser || cachedUser.expiresAt <= Date.now()) {
          const user = (await User.findById(claims.uid, claims.dept).select('-password'))[0];
          cachedUser = { user, expiresAt: Date.now() + CRM_USER_CACHE_TTL_MS };
          crmUsers.set(claims.uid, cachedUser);
          if (crmUsers.size > 2000) {
            for (const [key, entry] of crmUsers) if (entry.expiresAt <= Date.now()) crmUsers.delete(key);
            if (crmUsers.size > 2000) crmUsers.delete(crmUsers.keys().next().value);
          }
        }
        const user = cachedUser.user;
        requireThat(user && String(user.dept || '').trim().toLowerCase() === 'it',403,'IT membership required.');
        crmUser = user;
        uid = user.firebaseAuthUid || String(user._id || user.id || claims.uid);
      }
      requireThat(typeof uid === 'string' && /^[A-Za-z0-9_.-]{1,128}$/.test(uid),401,'Unsupported user ID.');
      // Mutations always fetch current authorization; GETs have a short bounded cache.
      req.member = req.method === 'GET'
        ? await cache.get(`member:${uid}`,()=>crmUser ? crmMembership(store,crmUser) : membership(store,uid))
        : await (crmUser ? crmMembership(store,crmUser) : membership(store,uid));
      next();
    } catch(error) { next(error); }
  };
}
export const managersOnly = (req,res,next) => { try { requireThat(manager(req.member),403,'Project Manager access required.'); next(); } catch(error) { next(error); } };
