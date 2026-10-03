import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import { createStore } from './store.js';

const directory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(directory, '../../.env') });

export function connect(env = process.env) {
  const projectId = env.FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error('FIREBASE_PROJECT_ID is required.');
  const hosts = [env.FIRESTORE_EMULATOR_HOST, env.FIREBASE_AUTH_EMULATOR_HOST, env.FIREBASE_STORAGE_EMULATOR_HOST];
  const emulated = hosts.every(Boolean);
  if (hosts.some(Boolean) && !emulated) throw new Error('All three emulator hosts are required; mixed live/emulator mode is forbidden.');
  if (emulated && (!projectId.startsWith('demo-') || hosts.some(h => !/^(127\.0\.0\.1|localhost):\d+$/.test(h)))) throw new Error('Emulators require a demo- project and loopback hosts.');
  if (env.NODE_ENV === 'production' && emulated) throw new Error('Emulator credentials are forbidden in production.');
  const existingApp = getApps().find(candidate => candidate.name === '[DEFAULT]');
  const serviceAccountPath = path.resolve(directory, '../../serviceAccount.json');
  const serviceAccount = !emulated && fs.existsSync(serviceAccountPath)
    ? JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'))
    : null;
  if (!emulated && (projectId.startsWith('demo-') || (env.ALLOW_LIVE_FIREBASE !== 'true' && !serviceAccount))) throw new Error('Live Firebase requires the configured backend service account or ALLOW_LIVE_FIREBASE=true.');
  if (serviceAccount && serviceAccount.project_id !== projectId) throw new Error('Backend service account project does not match FIREBASE_PROJECT_ID.');
  const app = existingApp || initializeApp({
    projectId,
    storageBucket: env.FIREBASE_STORAGE_BUCKET,
    ...(!emulated ? { credential: serviceAccount ? cert(serviceAccount) : applicationDefault() } : {}),
  });
  if (app.options.projectId !== projectId) throw new Error('Initialized Firebase app uses a different project.');
  const db = getFirestore(app, env.FIREBASE_DATABASE_ID || '(default)');
  const storageBucket = env.FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`;
  return { app, store: createStore(db), auth: getAuth(app), bucket: getStorage(app).bucket(storageBucket), emulated };
}
