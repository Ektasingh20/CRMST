import { Timestamp } from "firebase-admin/firestore";

export function encodeFirestoreValue(value) {
  if (value instanceof Timestamp) {
    return {
      __firestoreType: "timestamp",
      seconds: value.seconds,
      nanoseconds: value.nanoseconds,
    };
  }
  if (value instanceof Date) {
    return { __firestoreType: "date", value: value.toISOString() };
  }
  if (Array.isArray(value)) return value.map(encodeFirestoreValue);
  if (value && typeof value === "object") {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new Error(`Cannot create an exact attendance backup for unsupported Firestore value: ${value.constructor?.name || "object"}.`);
    }
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, encodeFirestoreValue(child)]));
  }
  return value;
}

export function decodeFirestoreValue(value) {
  if (Array.isArray(value)) return value.map(decodeFirestoreValue);
  if (value && typeof value === "object") {
    if (value.__firestoreType === "timestamp") return new Timestamp(value.seconds, value.nanoseconds);
    if (value.__firestoreType === "date") return new Date(value.value);
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, decodeFirestoreValue(child)]));
  }
  return value;
}

function orderedValue(value) {
  if (Array.isArray(value)) return value.map(orderedValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, orderedValue(value[key])]));
  }
  return value;
}

export function attendanceDataFingerprint(value) {
  return JSON.stringify(orderedValue(encodeFirestoreValue(value)));
}

export function sameAttendanceData(left, right) {
  return attendanceDataFingerprint(left) === attendanceDataFingerprint(right);
}
