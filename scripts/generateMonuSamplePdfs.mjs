import { jsPDF } from 'jspdf';
import { writeFileSync } from 'node:fs';
import { monuSampleSections } from '../frontend/src/It- dashboard/monuSampleDocuments.js';
for (const [index, [key, label, title, body]] of monuSampleSections.entries()) {
  const pdf = new jsPDF();
  pdf.setFillColor(249, 246, 241); pdf.rect(0, 0, 210, 297, 'F');
  pdf.setFillColor(37, 32, 28); pdf.rect(0, 0, 210, 66, 'F');
  pdf.setTextColor(223, 177, 121); pdf.setFontSize(10); pdf.text('MONU CRANE SERVICE', 22, 23);
  pdf.setTextColor(255, 255, 255); pdf.setFontSize(23); pdf.text(label, 22, 42);
  pdf.setFontSize(9); pdf.text('PROJECT REQUIREMENTS  /  SAMPLE DOCUMENT', 22, 54);
  pdf.setTextColor(139, 88, 49); pdf.setFontSize(11); pdf.text(`BRIEF ${String(index + 1).padStart(2, '0')}`, 22, 87);
  pdf.setTextColor(37, 32, 28); pdf.setFontSize(19); pdf.text(pdf.splitTextToSize(title, 164), 22, 103);
  pdf.setTextColor(91, 80, 70); pdf.setFontSize(12); pdf.text(pdf.splitTextToSize(body, 164), 22, 133, { lineHeightFactor: 1.7 });
  pdf.setDrawColor(218, 205, 190); pdf.line(22, 235, 188, 235);
  pdf.setFontSize(10); pdf.text('For demonstration only - not an approved client requirement.', 22, 248);
  pdf.text('Replace this sample with the final project document when available.', 22, 257);
  pdf.setFontSize(9); pdf.text('SYSTEM TECHNOLOGIES  /  PROJECT WORKSPACE', 22, 282); pdf.text('01', 181, 282);
  writeFileSync(`frontend/public/demo-documents/monu-${key}.pdf`, Buffer.from(pdf.output('arraybuffer')));
}
