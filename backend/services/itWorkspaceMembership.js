import { getFirestore } from "firebase-admin/firestore";

const VALID_TEAM_ROLES = new Set(["Lead", "Developer", "Tester", "Designer"]);
let cachedMemberIds;
let cachedAt = 0;
let loadingMembers;

const clean = value => String(value || "").trim();
const normalized = value => clean(value).toLowerCase();
const isIT = user => normalized(user?.dept || user?.department) === "it";
const isActive = user => !["inactive", "disabled", "former"].includes(normalized(user?.status || user?.employeeStatus || user?.type))
  && normalized(user?.exEmployee) !== "yes";

function teamRole(user, currentRole) {
  const role = normalized(user?.role || user?.position);
  if (role.includes("head") || role.includes("lead")) return "Lead";
  if (role.includes("test") || role.includes("qa")) return "Tester";
  if (role.includes("design") || role.includes("ui") || role.includes("ux")) return "Designer";
  return VALID_TEAM_ROLES.has(currentRole) ? currentRole : "Developer";
}

export function workspaceAppRole(user) {
  const accessLevel = normalized(user?.itWorkspaceRole);
  if (accessLevel === "it head") return "Project Manager";
  if (accessLevel === "it team") return "IT Employee";
  const roles = [user?.role, user?.position].map(normalized);
  if (roles.some(role => ["it head", "project manager"].includes(role))) return "Project Manager";
  // Before itWorkspaceRole existed, the frontend routed only interns and
  // junior developers to the junior workspace. Preserve that behavior for
  // existing profiles; newly created profiles carry an explicit access level.
  return roles.some(role => ["it team", "junior developer", "intern"].includes(role))
    ? "IT Employee"
    : "Project Manager";
}

export async function ensureITWorkspaceMembership(user) {
  const crmId = clean(user?._id || user?.id);
  if (!crmId) throw new Error("Cannot link IT workspace membership without a CRM user ID.");
  const db = getFirestore();
  const candidateIds = [...new Set([clean(user.firebaseAuthUid), crmId].filter(Boolean))];
  if (!isIT(user)) {
    for (const id of candidateIds) {
      const ref = db.doc(`itd_members/${id}`);
      const existing = await ref.get();
      if (existing.exists) await ref.set({ disabled: true }, { merge: true });
    }
    invalidateITWorkspaceMemberIds();
    return null;
  }

  let ref;
  let existingSnapshot;
  for (const id of candidateIds) {
    const candidate = db.doc(`itd_members/${id}`);
    const snapshot = await candidate.get();
    if (snapshot.exists || id === crmId) {
      ref = candidate;
      existingSnapshot = snapshot;
      break;
    }
  }
  // Newly created profiles use the CRM ID; imported profiles retain their
  // Firebase UID document so existing project assignments keep their IDs.
  ref ||= db.doc(`itd_members/${crmId}`);
  existingSnapshot ||= await ref.get();
  const existing = existingSnapshot.exists ? existingSnapshot.data() : {};
  const userPath = user?._ref?.path || `users/it/members/${crmId}`;
  const member = {
    userId: crmId,
    userPath,
    name: clean(user.name || user.username) || "IT Member",
    teamRole: teamRole(user, existing.teamRole),
    appRole: workspaceAppRole(user),
    onLeave: existing.onLeave === true,
    disabled: !isActive(user),
  };
  await ref.set(member, { merge: true });
  invalidateITWorkspaceMemberIds();
  return { ...existing, ...member, id: ref.id };
}

export function invalidateITWorkspaceMemberIds() {
  cachedMemberIds = undefined;
  cachedAt = 0;
}

export async function getITWorkspaceMemberIds() {
  if (cachedMemberIds && Date.now() - cachedAt < 5 * 60 * 1000) return cachedMemberIds;
  if (!loadingMembers) {
    loadingMembers = getFirestore().collection("itd_members").get().then(snapshot => {
      cachedMemberIds = new Map(snapshot.docs
        .filter(doc => doc.data().disabled !== true && ["IT Employee", "Project Manager"].includes(doc.data().appRole))
        .map(doc => [String(doc.data().userId || ""), doc.id]));
      cachedAt = Date.now();
      return cachedMemberIds;
    }).finally(() => { loadingMembers = null; });
  }
  return loadingMembers;
}
