export const monuSampleSections = [
  ['requiredFeatures', 'Required features', 'Service enquiries and quote requests', 'Visitors can choose a crane service, share a site location and request a quote. Include click-to-call, WhatsApp contact, equipment availability enquiries and an admin enquiry list.'],
  ['pagesModules', 'Pages and modules', 'A clear journey from services to enquiry', 'Home; About the company; Crane services; Equipment fleet; Project gallery; Contact and quote request. Each service page should explain the equipment, typical use cases and enquiry process.'],
  ['technologyRequirements', 'Technology requirements', 'Responsive website and enquiry management', 'Use React for the interface and responsive CSS for mobile, tablet and desktop. Validate enquiry forms, provide loading and error states, and keep contact actions accessible by keyboard.'],
  ['designRequirements', 'Design requirements', 'Industrial character with a clean presentation', 'Use warm neutral backgrounds, dark headings and restrained amber accents. Pair large crane photography with clear service cards. Keep phone and quote actions visible and ensure text remains readable on smaller screens.'],
  ['referenceWebsites', 'Reference direction', 'Content and layout references', 'Use an equipment catalogue layout for the fleet, a photographic grid for completed projects and a short form for quote requests. Final reference URLs and approved brand assets are to be supplied by the client.'],
  ['specialInstructions', 'Delivery checklist', 'Review before publishing', 'Confirm phone numbers, service locations and equipment specifications. Test quote submission, mobile navigation and contact links. Replace all sample copy and photography with approved client material before launch.'],
];

export function withMonuSampleDocuments(project) {
  const isMonu = /monu\s+crane\s+service/i.test(project.projectName || project.name || '');
  const existing = [...(Array.isArray(project.documents) ? project.documents : [project.documents]), ...Object.values(project.scopeFiles || {}).flat()].filter(Boolean);
  if (!isMonu || existing.some((file) => typeof file === 'object' && (file.dataUrl || file.url))) return project;
  // Presentation-only sample data: never persist over the user's project or replace real uploads.
  return {
    ...project, sampleDocuments: true, documents: [],
    scopeFiles: { ...Object.fromEntries(monuSampleSections.map(([key, label]) => [key, [{ name: `${label}.pdf`, type: 'application/pdf', dataUrl: `/demo-documents/monu-${key}.pdf`, sample: true }]])), ...project.scopeFiles },
    ...Object.fromEntries([
      ['requiredFeatures', 'Project requirements from the Admin create-project form.'],
      ['pagesModules', 'Project pages and modules'],
      ['technologyRequirements', 'React, responsive CSS'],
      ['designRequirements', 'Professional responsive dashboard'],
    ].filter(([key, placeholder]) => project[key] === placeholder).map(([key]) => [key, ''])),
    description: project.description === 'Frontend project created from the Admin dashboard.' ? 'Create a professional website for Monu Crane Service to showcase crane hire, lifting services and the equipment fleet. Make it easy for customers to explore services and request a quote.' : project.description,
  };
}
