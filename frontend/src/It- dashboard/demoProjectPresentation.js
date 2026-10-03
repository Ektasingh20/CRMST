import { jsPDF } from 'jspdf';
import { withMonuSampleDocuments, monuSampleSections } from './monuSampleDocuments.js';

const legacyDemos = { 1: 'CRM Lead Workflow', 2: 'Employee Self Service', 3: 'Student Progress Portal' };
const documentCache = new Map();

export function withDemoProjectPresentation(source) {
  const project = withMonuSampleDocuments(source);
  const isDemo = project.sampleDocuments || /^demo-project-[4-8]$/.test(String(project.id)) || legacyDemos[project.id] === (project.name || project.projectName);
  if (!isDemo) return project;

  const presented = {
    ...project,
    demoReview: true,
    projectId: project.projectId || `PRJ-2026-${String(project.id).replace('demo-project-', '').padStart(3, '0')}`,
    service: project.service || 'Web Application Development',
    assignedEmployeeName: project.assignedEmployeeName || project.assignedTo || 'Ekta Singh',
    specialInstructions: project.specialInstructions || 'Review the project brief before starting development.',
  };
  const existing = [...(Array.isArray(project.documents) ? project.documents : [project.documents]), ...Object.values(project.scopeFiles || {}).flat()].filter(Boolean);
  if (existing.some((file) => file.dataUrl || file.url)) return presented;

  const sections = monuSampleSections.map(([key, label]) => [key, label, project[key] || ({
    requiredFeatures: project.description,
    pagesModules: project.structure || 'Overview, project details, and reporting.',
    technologyRequirements: 'React and responsive CSS. Validate forms and provide loading, empty and error states.',
    designRequirements: 'Use accessible forms, clear navigation and responsive layouts for desktop and mobile.',
    referenceWebsites: `Follow the scope for ${project.name || project.projectName}. Confirm reference websites and brand assets with the project owner.`,
    specialInstructions: presented.specialInstructions,
  })[key] || 'Confirm requirements with the project owner.']);
  const signature = JSON.stringify([project.name || project.projectName, sections]);
  if (!documentCache.has(signature)) {
    documentCache.set(signature, Object.fromEntries(sections.map(([key, label, body]) => {
      const pdf = new jsPDF();
      pdf.setFontSize(10);
      pdf.text('DEMO WORKSPACE / SAMPLE DOCUMENT', 20, 20);
      pdf.setFontSize(20);
      const title = pdf.splitTextToSize(project.name || project.projectName, 170);
      pdf.text(title, 20, 36);
      const top = 40 + title.length * 9;
      pdf.setFontSize(16);
      pdf.text(label, 20, top);
      pdf.setFontSize(12);
      let y = top + 15;
      for (const line of pdf.splitTextToSize(String(body), 170)) {
        if (y > 265) { pdf.addPage(); y = 25; }
        pdf.text(line, 20, y);
        y += 7;
      }
      pdf.setFontSize(9);
      pdf.text('Sample brief - confirm final requirements before delivery.', 20, 285);
      return [key, [{ name: `${label}.pdf`, type: 'application/pdf', dataUrl: pdf.output('datauristring'), sample: true }]];
    })));
  }
  return { ...presented, sampleDocuments: true, documents: [], scopeFiles: documentCache.get(signature) };
}
