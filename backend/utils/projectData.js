export const scopeKeys = ['description', 'requiredFeatures', 'pagesModules', 'technologyRequirements', 'designRequirements', 'clientBudget', 'referenceWebsites', 'specialInstructions'];
export const userId = user => String(user?.id || user?._id || '');
export const isIT = user => [user?.role, user?.dept, user?.department].some(value => String(value || '').trim().toLowerCase() === 'it');
export const employeeKey = user => `${String(user.name || user.username || 'IT Employee').replaceAll('/', '-')}--${encodeURIComponent(userId(user))}`;

export function validatePdf(body) {
  if (!body || typeof body.name !== 'string' || !/\.pdf$/i.test(body.name) || typeof body.dataUrl !== 'string' || !/^data:application\/pdf;base64,[A-Za-z0-9+/=\r\n]+$/.test(body.dataUrl)) throw new Error('Choose a PDF file.');
  const bytes = Buffer.from(body.dataUrl.split(',')[1], 'base64');
  if (!bytes.length || bytes.length > 3 * 1024 * 1024 || bytes.subarray(0, 5).toString() !== '%PDF-') throw new Error('Upload a valid PDF, no larger than 3 MB.');
  return bytes;
}

export function projectFields(body, documents, scopeFiles) {
  const fields = Object.fromEntries(['projectName', 'client', 'service', 'priority', 'startDate', 'expectedDelivery', ...scopeKeys].map(key => [key, typeof body[key] === 'string' ? body[key].trim() : '']));
  if (Object.values(fields).some(value => value.length > 10000)) throw new Error('Project text is too long.');
  if (!fields.projectName || !fields.client || !fields.startDate || !fields.expectedDelivery) throw new Error('Complete the project information.');
  if (![fields.startDate, fields.expectedDelivery].every(value => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value))) || fields.expectedDelivery < fields.startDate) throw new Error('Choose valid project dates.');
  if (!['Low', 'Medium', 'High', 'Urgent'].includes(fields.priority)) throw new Error('Choose a valid priority.');
  if (scopeKeys.filter(key => key !== 'clientBudget').some(key => !fields[key] && !scopeFiles[key]?.length)) throw new Error('Complete every required scope section.');
  if (!documents.length && !Object.values(scopeFiles).some(files => files.length)) throw new Error('Attach at least one PDF.');
  return fields;
}

// Store only meaningful values; retain zero and false because they carry state.
function compact(value) {
  if (value == null || value === '') return undefined;
  if (Array.isArray(value)) {
    const items = value.map(compact).filter(item => item !== undefined);
    return items.length ? items : undefined;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value).map(([key, item]) => [key, compact(item)]).filter(([, item]) => item !== undefined);
    return entries.length ? Object.fromEntries(entries) : undefined;
  }
  return value;
}

export function storedProject(project) {
  const result = { ...project };
  // Identity is already in the Firestore path and parent employee document.
  for (const key of ['id', 'projectId', 'employeeKey', 'assignedEmployeeId', 'assignedEmployeeName', 'createdById']) delete result[key];
  if (result.completionRemarks === result.statusRemarks) delete result.completionRemarks;
  if (result.status === 'Completed') {
    if (result.executionStatus === 'Completed') delete result.executionStatus;
    if (result.progress === 100) delete result.progress;
    if (result.allTasksCompleted === true) delete result.allTasksCompleted;
  }
  return compact(result) || {};
}

export function projectResponse(data, employee, key, projectId) {
  return {
    ...data,
    ...(data.status === 'Completed' ? { executionStatus: 'Completed', progress: 100, allTasksCompleted: true, completionRemarks: data.completionRemarks || data.statusRemarks || '' } : {}),
    id: projectId, projectId, employeeKey: key,
    assignedEmployeeId: employee.assignedEmployeeId,
    assignedEmployeeName: employee.assignedEmployeeName,
    documents: data.documents || [], scopeFiles: data.scopeFiles || {},
  };
}
