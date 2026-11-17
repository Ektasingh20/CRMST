import { getFirestore } from "firebase-admin/firestore";
import User from "../models/User.js";

const clean = (value) => String(value ?? "").trim();
const NOTIFICATION_CACHE_TTL_MS = 5 * 60 * 1000;
const notificationCache = new Map();

function cachedNotifications(recipientId) {
  const id = clean(recipientId);
  if (!notificationCache.has(id)) notificationCache.set(id, { items: null, fetchedAt: 0, pending: null, revision: 0 });
  return notificationCache.get(id);
}

const copyNotifications = (items) => items.map((item) => ({ ...item }));

function updateNotificationCache(recipientId, update) {
  const cache = cachedNotifications(recipientId);
  cache.revision += 1;
  cache.pending = null;
  if (cache.items) cache.items = update(cache.items);
}

function isStudent(user) {
  return [user?.role, user?.dept, user?.department]
    .some((value) => ["student", "students"].includes(clean(value).toLowerCase()));
}

function notificationJson(snapshot) {
  const data = snapshot.data();
  const createdAt = data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt || null;
  return { id: snapshot.id, ...data, createdAt };
}

async function findRecipient(recipientId) {
  const id = clean(recipientId);
  if (!id) return null;
  const direct = (await User.findById(id))[0];
  return direct || User.findOne({ id });
}

function ownerRef(user) {
  const id = clean(user?.id || user?._id);
  if (!id) throw new Error("Notification recipient ID is required.");
  if (isStudent(user)) return getFirestore().collection("students").doc(id);
  if (!user?._ref) throw new Error(`Notification recipient ${id} does not have a Firestore user document.`);
  return user._ref;
}

async function nestedNotificationsRef(recipientId) {
  const user = await findRecipient(recipientId);
  if (!user) throw new Error(`Notification recipient ${clean(recipientId)} was not found.`);
  return { user, owner: ownerRef(user), notifications: ownerRef(user).collection("notifications") };
}

async function readCollection(ref) {
  try {
    return (await ref.orderBy("createdAt", "desc").limit(100).get()).docs.map(notificationJson);
  } catch (error) {
    const snapshot = await ref.limit(100).get();
    return snapshot.docs.map(notificationJson);
  }
}

function newestFirst(left, right) {
  return new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime();
}

export async function createAppNotification(recipientId, payload) {
  const { user, owner, notifications } = await nestedNotificationsRef(recipientId);
  const id = clean(payload.id) || `NOTIF-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const recipientName = clean(user.name || user.username);
  const data = {
    ...payload,
    id,
    recipientId: clean(user.id || user._id),
    ...(recipientName ? { recipientName } : {}),
    read: Boolean(payload.read),
    createdAt: payload.createdAt || new Date().toISOString(),
  };
  const batch = getFirestore().batch();
  if (isStudent(user)) {
    batch.set(owner, {
      studentId: data.recipientId,
      ...(recipientName ? { studentName: recipientName } : {}),
    }, { merge: true });
  }
  batch.set(notifications.doc(id), data);
  await batch.commit();
  const saved = { id, ...data };
  updateNotificationCache(data.recipientId, (items) => [saved, ...items.filter((item) => item.id !== id)]
    .sort(newestFirst).slice(0, 100));
  return saved;
}

export async function listAppNotifications(recipientId) {
  const id = clean(recipientId);
  const cache = cachedNotifications(id);
  if (cache.items && Date.now() - cache.fetchedAt < NOTIFICATION_CACHE_TTL_MS) return copyNotifications(cache.items);
  if (!cache.pending) {
    const startedAtRevision = cache.revision;
    const request = (async () => {
      const { notifications } = await nestedNotificationsRef(id);
      const [nested, legacySnapshot] = await Promise.all([
        readCollection(notifications),
        // Read-only rollout compatibility. All new writes use the nested path.
        getFirestore().collection("notifications").where("recipientId", "==", id).limit(100).get(),
      ]);
      const byId = new Map(nested.map((item) => [item.id, item]));
      legacySnapshot.docs.map(notificationJson).forEach((item) => {
        if (!byId.has(item.id)) byId.set(item.id, item);
      });
      const items = [...byId.values()].sort(newestFirst).slice(0, 100);
      if (cache.revision === startedAtRevision) {
        cache.items = items;
        cache.fetchedAt = Date.now();
      }
      return items;
    })();
    const wrapped = request.finally(() => { if (cache.pending === wrapped) cache.pending = null; });
    cache.pending = wrapped;
  }
  return copyNotifications(await cache.pending);
}

export async function markAppNotificationRead(recipientId, notificationId) {
  const id = clean(recipientId);
  const notificationKey = clean(notificationId);
  const { notifications } = await nestedNotificationsRef(id);
  const nestedRef = notifications.doc(notificationKey);
  const nested = await nestedRef.get();
  if (nested.exists) {
    await nestedRef.update({ read: true });
    const saved = { ...notificationJson(nested), read: true };
    updateNotificationCache(id, (items) => items.map((item) => item.id === notificationKey ? saved : item));
    return saved;
  }

  // Legacy records remain readable until the migration is applied.
  const legacyRef = getFirestore().collection("notifications").doc(notificationKey);
  const legacy = await legacyRef.get();
  if (!legacy.exists || clean(legacy.data().recipientId) !== id) return null;
  await legacyRef.update({ read: true });
  const saved = { ...notificationJson(legacy), read: true };
  updateNotificationCache(id, (items) => items.map((item) => item.id === notificationKey ? saved : item));
  return saved;
}

export const appNotificationInternals = { isStudent, ownerRef };
