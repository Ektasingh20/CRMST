export const requirementSections = [
  ['description', 'Project description'], ['requiredFeatures', 'Required features'],
  ['pagesModules', 'Pages / modules'], ['technologyRequirements', 'Technology requirements'],
  ['designRequirements', 'Design requirements'], ['clientBudget', 'Client budget'],
  ['referenceWebsites', 'Reference websites'], ['specialInstructions', 'Special instructions'],
];

export function getUploadedProjectFiles(project) {
  const asArray = (value) => Array.isArray(value) ? value : value ? [value] : [];
  const groups = [['documents', 'Project documents', project.documents],
    ...Object.entries(project.scopeFiles || {}).map(([key, files]) => [key, requirementSections.find(([name]) => name === key)?.[1] || key, files])];
  return groups.flatMap(([section, category, files]) => asArray(files).filter(Boolean).map((value, index) => {
    const file = typeof value === 'string' ? { name: value } : value;
    return { ...file, id: `${section}-${index}`, section, category };
  })).filter((file) => file.name);
}
