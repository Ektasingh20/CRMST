import { getFirestore } from "firebase-admin/firestore";

export const whatsappMessages = () => getFirestore().collection("whatsappMessages");
export const whatsappMessageRef = (templateId) => whatsappMessages().doc(String(templateId));
export const whatsappConfigRef = () => whatsappMessages().doc("config");
