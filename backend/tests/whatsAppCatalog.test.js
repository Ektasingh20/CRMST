import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseWhatsAppCatalog, demoPaymentUrl } from "../utils/whatsAppCatalog.js";

const serviceSource = readFileSync(new URL("../data/serviceWhatsAppMessages.txt", import.meta.url), "utf8");
const trainingSource = readFileSync(new URL("../data/trainingWhatsAppMessages.txt", import.meta.url), "utf8");

test("imports every supplied message without changing its content", () => {
  const services = parseWhatsAppCatalog(serviceSource, "service");
  const training = parseWhatsAppCatalog(trainingSource, "training");
  assert.equal(services.length, 30);
  assert.equal(training.length, 19);
  assert.equal(services[0].title, "Basic Website Development");
  assert.equal(services[0].amount, 15000);
  assert.match(services[0].message, /We can build a professional and responsive static website/);
  assert.match(services[0].message, /Starting Price: ₹15,000/);
  assert.equal(training[0].title, "Front End Development – 3 Months");
  assert.equal(training[0].amount, 9000);
  assert.match(training[0].message, /Learn HTML, CSS, Bootstrap, JavaScript/);
  assert.match(training[0].message, /Course Fee: ₹9,000/);
  assert.equal(services.at(-1).title, "Analytics Dashboard Setup");
  assert.equal(training.at(-1).title, "3D Interior & Exterior Design");
  assert.ok([...services, ...training].every((item) => !item.message.includes("WhatsApp Message:")));
  assert.ok([...services, ...training].every((item) => !/CRM Solutions|Cloud Solutions|Marketing Tools & Automation/u.test(item.message.split("\n").at(-1))));
  assert.equal(new Set([...services, ...training].map((item) => `${item.type}-${item.key}`)).size, 49);
});

test("demo payment links retain the selected title and amount", () => {
  const url = demoPaymentUrl("training-test", "Front End Development – 3 Months", 9000);
  const parsed = new URL(url, "https://example.com");
  assert.equal(parsed.searchParams.get("templateId"), "training-test");
  assert.equal(parsed.searchParams.get("title"), "Front End Development – 3 Months");
  assert.equal(parsed.searchParams.get("amount"), "9000");
});
