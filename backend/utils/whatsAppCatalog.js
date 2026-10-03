const serviceNumbers = [...Array.from({ length: 22 }, (_, index) => index + 1), ...Array.from({ length: 8 }, (_, index) => index + 24)];
const trainingNumbers = Array.from({ length: 19 }, (_, index) => index + 1);

const normalizeTitle = (value) => String(value || "").replace(/^[\p{Extended_Pictographic}\uFE0F\u200D\s]+/u, "").trim();
export const templateKey = (value) => String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function parseWhatsAppCatalog(source, type) {
  if (type !== "training" && type !== "service") throw new Error("Unsupported message type.");
  const expectedNumbers = type === "training" ? trainingNumbers : serviceNumbers;
  const lines = String(source).replace(/\r\n/g, "\n").split("\n");
  const headings = [];
  for (let index = 0; index < lines.length && headings.length < expectedNumbers.length; index += 1) {
    const match = lines[index].match(/^\s*(?:[\p{Extended_Pictographic}\uFE0F\u200D]+\s*)?(\d{1,2})\.?\s*(.+)$/u);
    if (match && Number(match[1]) === expectedNumbers[headings.length]) {
      headings.push({ index, title: normalizeTitle(match[2]) });
    }
  }
  if (headings.length !== expectedNumbers.length) {
    throw new Error(`Expected ${expectedNumbers.length} ${type} messages, found ${headings.length}.`);
  }
  return headings.map((heading, index) => {
    const end = headings[index + 1]?.index ?? lines.length;
    const block = lines.slice(heading.index + 1, end)
      .filter((line) => !/^\s*WhatsApp Message:\s*$/i.test(line))
      .filter((line) => !/^\s*(?:⚙️\s*\.\s*CRM Solutions|☁️\s*\.\s*Cloud Solutions|📊\s*Marketing Tools & Automation)\s*$/u.test(line));
    while (block.length && !block[0].trim()) block.shift();
    while (block.length && !block.at(-1).trim()) block.pop();
    const message = block.join("\n");
    if (!message) throw new Error(`Missing message for ${heading.title}.`);
    const listedPrice = message.match(/₹\s*([\d,]+)/u);
    const priceText = block.filter((line) => /💰|₹/u.test(line)).join("\n");
    return {
      type,
      key: templateKey(heading.title),
      title: heading.title,
      message,
      amount: listedPrice ? Number(listedPrice[1].replace(/,/g, "")) : 0,
      priceText,
      active: true,
      order: index + 1,
    };
  });
}

export function demoPaymentUrl(templateId, title, amount) {
  return `/demo-payment.html?templateId=${encodeURIComponent(templateId)}&title=${encodeURIComponent(title)}&amount=${encodeURIComponent(amount)}`;
}
