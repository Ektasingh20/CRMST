import { readFileSync } from "node:fs";
import { getFirestore } from "firebase-admin/firestore";
import { connectDatabase } from "../config/db.js";
import { demoPaymentUrl, parseWhatsAppCatalog } from "../utils/whatsAppCatalog.js";
import { whatsappConfigRef, whatsappMessages } from "../config/firestoreWhatsAppModel.js";
import { defaultWhatsAppConfig } from "../config/whatsAppDefaults.js";

const trainingSource = readFileSync(new URL("../data/trainingWhatsAppMessages.txt", import.meta.url), "utf8");
const serviceSource = readFileSync(new URL("../data/serviceWhatsAppMessages.txt", import.meta.url), "utf8");
const catalog = [
  ...parseWhatsAppCatalog(trainingSource, "training"),
  ...parseWhatsAppCatalog(serviceSource, "service"),
];
const starterMessage = (value) => /Thank you for your interest in (?:our )?\{\{title\}\} (?:service at|at) System Technologies/u.test(String(value || ""));

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  await connectDatabase();
  const db = getFirestore();
  const templates = whatsappMessages();
  const [templateSnapshot, configSnapshot] = await Promise.all([templates.get(), whatsappConfigRef().get()]);
  const existingTemplates = new Map(templateSnapshot.docs.map((document) => [document.id, document.data()]));
  const desiredIds = new Set(catalog.map((entry) => `${entry.type}-${entry.key}`));
  const obsoleteStarters = templateSnapshot.docs.filter((document) => !desiredIds.has(document.id)
    && document.data().active === true && starterMessage(document.data().message));
  const preservedPaymentIds = new Set(catalog.map((entry) => `${entry.type}-${entry.key}`)
    .filter((id) => existingTemplates.get(id)?.paymentLink?.url && existingTemplates.get(id)?.paymentLink?.demo !== true));

  console.log(`${catalog.length} exact supplied messages: ${catalog.filter((entry) => existingTemplates.has(`${entry.type}-${entry.key}`)).length} existing, ${catalog.filter((entry) => !existingTemplates.has(`${entry.type}-${entry.key}`)).length} new.`);
  console.log(`${obsoleteStarters.length} old generic starter templates ${dryRun ? "would be deactivated" : "to deactivate"}; ${preservedPaymentIds.size} existing non-demo payment links preserved.`);
  if (dryRun) return;

  const operations = [];
  if (!configSnapshot.exists) operations.push((batch) => batch.set(whatsappConfigRef(), defaultWhatsAppConfig));
  catalog.forEach((entry) => {
    const id = `${entry.type}-${entry.key}`;
    const amount = entry.amount || 1;
    const paymentLink = preservedPaymentIds.has(id) ? existingTemplates.get(id).paymentLink : {
      url: demoPaymentUrl(id, entry.title, amount), amount, active: true, demo: true,
    };
    operations.push((batch) => batch.set(templates.doc(id), { ...entry, paymentLink }, { merge: true }));
  });
  obsoleteStarters.forEach((document) => operations.push((batch) => batch.update(document.ref, { active: false })));
  for (let offset = 0; offset < operations.length; offset += 200) {
    const batch = db.batch();
    operations.slice(offset, offset + 200).forEach((operation) => operation(batch));
    await batch.commit();
  }
  console.log(`Saved ${catalog.length} supplied messages and their demo payment links.`);
}

main().then(() => process.exit(0)).catch((error) => { console.error(error); process.exit(1); });
