import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeCallingRecord, detectDuplicateCandidates } from '../utils/callingImport.js';

test('normalizeCallingRecord maps common field aliases to CRM fields', () => {
  const record = normalizeCallingRecord({
    'Student Name': 'Rahul Sharma',
    'Mobile Number': '9876543210',
    'Email Address': 'rahul@gmail.com',
    'City Name': 'Jaipur',
    'Qualification': 'B.Tech',
    'College/Institute': 'ABC College',
    'Course Interest': 'Web Development',
    'Program Interest': 'Internship',
    'Source': 'Website',
  }, {
    name: 'Student Name',
    phone: 'Mobile Number',
    email: 'Email Address',
    city: 'City Name',
    qualification: 'Qualification',
    college: 'College/Institute',
    courseInterest: 'Course Interest',
    programInterest: 'Program Interest',
    source: 'Source',
  });

  assert.equal(record.name, 'Rahul Sharma');
  assert.equal(record.phone, '9876543210');
  assert.equal(record.email, 'rahul@gmail.com');
  assert.equal(record.city, 'Jaipur');
  assert.equal(record.courseInterest, 'Web Development');
  assert.equal(record.programInterest, 'Internship');
  assert.equal(record.source, 'Website');
});

test('detectDuplicateCandidates flags duplicate phone or email entries', () => {
  const records = [
    { phone: '9876543210', email: 'rahul@gmail.com', name: 'Rahul Sharma' },
    { phone: '9876543210', email: 'other@gmail.com', name: 'Rahul Duplicate' },
    { phone: '9999999999', email: 'rahul@gmail.com', name: 'Rahul Duplicate 2' },
    { phone: '8888888888', email: 'fresh@gmail.com', name: 'New Candidate' },
  ];

  const result = detectDuplicateCandidates(records);

  assert.equal(result.duplicateCount, 2);
  assert.equal(result.newCount, 2);
  assert.equal(result.duplicates[0].phone, '9876543210');
});
