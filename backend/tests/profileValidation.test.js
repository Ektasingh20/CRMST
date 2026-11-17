import test from "node:test";
import assert from "node:assert/strict";
import { isValidAadhaar, isValidBankAccount, isValidEmail, isValidIfsc, isValidIndianMobile, isValidPan, isValidPersonName, isValidProfileDob } from "../../shared/profileValidation.js";

test("Indian KYC and banking validators accept valid canonical values", () => {
  assert.equal(isValidIndianMobile("9876543210"), true);
  assert.equal(isValidPan("ABCDE1234F"), true);
  assert.equal(isValidAadhaar("999999990019"), true);
  assert.equal(isValidIfsc("HDFC0123456"), true);
  assert.equal(isValidBankAccount("001234567890"), true);
  assert.equal(isValidPersonName("Priya D'Souza"), true);
  assert.equal(isValidEmail("priya@example.com"), true);
  assert.equal(isValidProfileDob("1995-08-17", "2026-11-17"), true);
});

test("Indian KYC and banking validators reject malformed or checksum-invalid values", () => {
  assert.equal(isValidIndianMobile("1234567890"), false);
  assert.equal(isValidPan("244DFS54AS"), false);
  assert.equal(isValidAadhaar("123456789012"), false);
  assert.equal(isValidIfsc("HDFC1234567"), false);
  assert.equal(isValidBankAccount("12AB34"), false);
  assert.equal(isValidPersonName("8888777788"), false);
  assert.equal(isValidEmail("not-an-email"), false);
  assert.equal(isValidProfileDob("2030-01-01", "2026-11-17"), false);
});
