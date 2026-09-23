import test from "node:test";
import assert from "node:assert/strict";
import { callListPrograms, matchesCallListFilters, normalizeCallProgram, mergeCallListRows } from "./callListConfig.js";

test("upload responses and live events keep each contact once in either arrival order", () => {
  const first = { id: "contact-1", listType: "services", name: "First" };
  const second = { id: "contact-2", listType: "services", name: "Second" };
  const uploaded = [first, second];
  const eventsFirst = mergeCallListRows([second], mergeCallListRows([first]));
  assert.deepEqual(mergeCallListRows(uploaded, eventsFirst), uploaded);
  const uploadFirst = mergeCallListRows(uploaded);
  assert.equal(mergeCallListRows([first], uploadFirst).length, 2);
  assert.equal(mergeCallListRows(uploaded, [...uploaded, ...uploaded]).length, 2);
});

test("merging keeps new values and preserves contacts with the same ID in different lists", () => {
  const old = { id: "same", listType: "services", name: "Old" };
  const updated = { ...old, name: "Updated" };
  const training = { ...old, listType: "training" };
  assert.deepEqual(mergeCallListRows([updated], [old, training]), [updated, training]);
});

const contact = {
  name: "Ekta", contact: "+91 88901-17153", program: "CRM Solutions",
  callStatus: "Follow Up", interestStatus: "Interested", assignedTo: 42,
  date: "2026-09-17T10:00:00Z", listType: "services",
};

test("all filters combine and each can exclude a contact", () => {
  const filters = { search: " EKTA ", program: "CRM Solutions", callStatus: "Follow Up",
    interest: "Interested", employee: "42", date: "2026-09-17", listType: "services" };
  assert.equal(matchesCallListFilters(contact, filters), true);
  for (const [key, value] of Object.entries({ search: "missing", program: "Cloud Solutions",
    callStatus: "Completed", interest: "Not Interested", employee: "43", date: "2026-09-18", listType: "training" })) {
    assert.equal(matchesCallListFilters(contact, { ...filters, [key]: value }), false, key);
  }
  assert.equal(matchesCallListFilters(contact), true);
});

test("formatted phone searches and missing fields are safe", () => {
  assert.equal(matchesCallListFilters(contact, { search: "8890117153" }), true);
  assert.equal(matchesCallListFilters({ contact: 1234567890 }, { search: "123456" }), true);
  assert.equal(matchesCallListFilters({}, { search: "Ekta" }), false);
});

test("legacy values match the unselected values displayed in both lists", () => {
  for (const program of ["IT Services", "IT Service", "IT Training", "-"]) {
    assert.equal(normalizeCallProgram(program), "");
    assert.equal(matchesCallListFilters({ program, callStatus: "Not Called", interestStatus: "Cold" },
      { program: "", callStatus: "Select Status", interest: "Select Status" }), true);
  }
});

test("both catalogs contain every specific option and exclude generic IT options", () => {
  assert.equal(callListPrograms("services").length, 18);
  assert.equal(callListPrograms("training").length, 14);
  assert.equal(callListPrograms("All").some((program) => /^IT (Services|Training)$/.test(program)), false);
  for (const type of ["services", "training"]) {
    for (const program of callListPrograms(type)) {
      assert.equal(matchesCallListFilters({ program, listType: type }, { program, listType: type }), true);
    }
  }
});
