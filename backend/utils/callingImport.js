const FIELD_ALIASES = {
  name: ["name", "student name", "candidate name", "applicant name", "full name"],
  phone: ["phone", "mobile", "mobile number", "contact", "whatsapp number", "whatsapp", "phone number"],
  courseInterest: ["course interest", "course", "preferred course", "training interest"],
  programInterest: ["program interest", "program", "interest", "service interest", "training program"],
  source: ["source", "lead source", "campaign source", "reference"],
};

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function pickValue(record, values = []) {
  for (const key of values) {
    if (Object.prototype.hasOwnProperty.call(record, key)) return record[key];
    const normalizedKey = normalizeKey(key);
    const match = Object.keys(record).find((candidate) => normalizeKey(candidate) === normalizedKey);
    if (match) return record[match];
  }
  return "";
}

function cleanPhone(value) {
  let digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  return /^[6-9]\d{9}$/.test(digits) ? digits : "";
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

export function normalizeCallingRecord(rawRecord = {}, mapping = {}) {
  const normalized = {};

  const assign = (targetKey, explicitKey) => {
    const sourceKey = explicitKey || Object.keys(mapping).find((key) => key === targetKey || mapping[key] === targetKey);
    const mapped = sourceKey ? pickValue(rawRecord, [sourceKey]) : pickValue(rawRecord, FIELD_ALIASES[targetKey] || []);
    normalized[targetKey] = mapped ?? "";
  };

  const mappedFields = { ...mapping };
  for (const key of Object.keys(mappedFields)) {
    const sourceValue = mappedFields[key];
    if (sourceValue && rawRecord[sourceValue] !== undefined) {
      normalized[key] = rawRecord[sourceValue];
    }
  }

  const name = normalizeText(mappedFields.name ? rawRecord[mappedFields.name] : pickValue(rawRecord, FIELD_ALIASES.name));
  const phone = cleanPhone(mappedFields.phone ? rawRecord[mappedFields.phone] : pickValue(rawRecord, FIELD_ALIASES.phone));
  const courseInterest = normalizeText(mappedFields.courseInterest ? rawRecord[mappedFields.courseInterest] : pickValue(rawRecord, FIELD_ALIASES.courseInterest));
  const programInterest = normalizeText(mappedFields.programInterest ? rawRecord[mappedFields.programInterest] : pickValue(rawRecord, FIELD_ALIASES.programInterest));
  const source = normalizeText(mappedFields.source ? rawRecord[mappedFields.source] : pickValue(rawRecord, FIELD_ALIASES.source)) || "Website";

  return {
    name: name || "Unknown Candidate",
    phone,
    courseInterest,
    programInterest,
    source,
    callStatus: "Pending",
    interestStatus: "Not Contacted",
    programType: programInterest || "Training",
    internshipInterest: "Need Details",
    active: true,
    assignedTo: "",
    followUpDate: "",
    followUpTime: "",
    remark: "",
    status: "Pending",
    type: "Training",
  };
}

export function detectDuplicateCandidates(records = []) {
  const seen = new Set();
  const duplicates = [];
  const validRecords = [];

  records.forEach((record) => {
    const candidate = record || {};
    const normalizedPhone = String(candidate.phone || "").replace(/\D/g, "").slice(-10);
    const normalizedEmail = String(candidate.email || "").trim().toLowerCase();

    if (!candidate.name && !normalizedPhone && !normalizedEmail) {
      return;
    }

    const candidateKeys = [normalizedPhone, normalizedEmail].filter(Boolean);
    const duplicateKey = candidateKeys.find((key) => seen.has(key));

    if (duplicateKey) {
      duplicates.push({
        ...candidate,
        duplicateKey,
        duplicateOf: { name: candidate.name || "Unknown Candidate", phone: normalizedPhone, email: normalizedEmail },
      });
      return;
    }

    candidateKeys.forEach((key) => seen.add(key));
    validRecords.push(candidate);
  });

  return {
    total: records.length,
    newCount: validRecords.length,
    duplicateCount: duplicates.length,
    invalidCount: Math.max(0, records.length - validRecords.length - duplicates.length),
    duplicates,
    validRecords,
  };
}

export function buildAutoMapping(row = {}) {
  const mapping = {};
  const keys = Object.keys(row || {});

  for (const [targetKey, aliases] of Object.entries(FIELD_ALIASES)) {
    const match = keys.find((key) => aliases.some((alias) => normalizeKey(key) === normalizeKey(alias)));
    if (match) {
      mapping[targetKey] = match;
    }
  }

  return mapping;
}

export function normalizeImportPayload(rows = [], mapping = {}) {
  return rows.map((row) => normalizeCallingRecord(row, mapping));
}
