import test from "node:test";
import assert from "node:assert/strict";
import { defaultWhatsAppConfig } from "../backend/config/whatsAppDefaults.js";
import {
  buildMessage,
  isLocalPaymentUrl,
  normalizeWhatsAppPhone,
  resolveLeadTemplate,
  resolvePaymentUrl,
  sendWhatsApp,
  templateSelectionPatch,
} from "./whatsAppMessage.js";

test("normalizes Indian WhatsApp numbers", () => {
  assert.equal(normalizeWhatsAppPhone("+91 98765-43210"), "919876543210");
  assert.equal(normalizeWhatsAppPhone("98765 43210"), "919876543210");
  assert.throws(() => normalizeWhatsAppPhone("123"), /valid phone/);
});

test("builds the payment message from all placeholders", () => {
  const message = buildMessage(defaultWhatsAppConfig.paymentMessage, {
    name: "Asha", amount: 500, title: "Training", link: "https://example.com/pay",
  });
  assert.match(message, /Hello Asha/);
  assert.match(message, /₹500 for Training/);
  assert.match(message, /https:\/\/example\.com\/pay/);
  assert.doesNotMatch(message, /{{/);
});

test("demo payment message uses a public placeholder and clearly cannot collect money", () => {
  const message = buildMessage(defaultWhatsAppConfig.demoPaymentMessage, {
    name: "Asha", amount: 500, title: "Training", link: defaultWhatsAppConfig.demoPaymentUrl,
  });
  assert.match(message, /https:\/\/example\.com\//);
  assert.match(message, /No payment can be made/);
  assert.equal(isLocalPaymentUrl(defaultWhatsAppConfig.demoPaymentUrl), false);
});

test("builds a separate common introduction for Training and Service", () => {
  const intro = buildMessage(defaultWhatsAppConfig.greetingMessage, { name: "Asha" });
  assert.match(intro, /^Hello Asha 👋\nThank you for connecting with System Technologies!/);
  assert.match(intro, /our team is happy to help\.$/);
  assert.doesNotMatch(intro, /next message/i);
  assert.equal(buildMessage("🎬 Learn Video Editing"), "🎬 Learn Video Editing");
});

test("resolves saved IDs and legacy display names", () => {
  const templates = [
    { id: "training-web", type: "training", title: "Web Training" },
    { id: "service-web", type: "service", title: "Web Service" },
  ];
  assert.equal(resolveLeadTemplate({ programId: "training-web" }, "training", templates)?.id, "training-web");
  assert.equal(resolveLeadTemplate({ program: "Web Service" }, "service", templates)?.id, "service-web");
  assert.deepEqual(templateSelectionPatch("training", templates[0]), { programId: "training-web", program: "Web Training" });
  assert.deepEqual(templateSelectionPatch("service", templates[1]), { serviceId: "service-web", program: "Web Service" });
});

test("opens the encoded WhatsApp URL before logging", async () => {
  const steps = [];
  const url = await sendWhatsApp({
    phone: "9876543210", message: "Hi Asha & team", log: { leadId: "lead-1" },
    openWindow: (value) => steps.push(["open", value]),
    logMessage: async (entry) => steps.push(["log", entry]),
  });
  assert.equal(url, "https://api.whatsapp.com/send?phone=919876543210&text=Hi%20Asha%20%26%20team");
  assert.deepEqual(steps, [
    ["open", url],
    ["log", { leadId: "lead-1", phone: "919876543210" }],
  ]);
});

test("turns a demo payment path into a shareable absolute link", () => {
  assert.equal(
    resolvePaymentUrl("/demo-payment.html?amount=9000", "https://crm.example.com"),
    "https://crm.example.com/demo-payment.html?amount=9000",
  );
  assert.throws(() => resolvePaymentUrl("javascript:alert(1)", "https://crm.example.com"), /invalid/);
});

test("identifies payment links that only work on the sender's computer", () => {
  assert.equal(isLocalPaymentUrl("http://localhost:5174/demo-payment.html"), true);
  assert.equal(isLocalPaymentUrl("http://127.0.0.1:5174/demo-payment.html"), true);
  assert.equal(isLocalPaymentUrl("https://crm.example.com/demo-payment.html"), false);
});

test("the WhatsApp URL preserves the complete emoji message", async () => {
  const message = buildMessage(defaultWhatsAppConfig.greetingMessage, { name: "Asha" });
  const url = await sendWhatsApp({
    phone: "9876543210", message, log: { leadId: "lead-1" },
    openWindow: () => {}, logMessage: async () => {},
  });
  assert.equal(new URL(url).searchParams.get("text"), message);
  assert.match(url, /text=Hello%20Asha%20%F0%9F%91%8B/);
  assert.doesNotMatch(url, /\uFFFD/);
});
