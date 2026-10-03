import { connectDatabase } from "../config/db.js";
import { whatsappConfigRef } from "../config/firestoreWhatsAppModel.js";
import { defaultWhatsAppConfig } from "../config/whatsAppDefaults.js";

await connectDatabase();
const ref = whatsappConfigRef();
const snapshot = await ref.get();
if (snapshot.exists) {
  console.log("WhatsApp config already exists; no fields were overwritten.");
} else {
  await ref.create(defaultWhatsAppConfig);
  console.log("Created whatsappMessages/config with Greeting and Payment message settings.");
}
