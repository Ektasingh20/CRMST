import bcrypt from "bcryptjs";
import { getFirestore } from "firebase-admin/firestore";
import { connectDatabase } from "../config/db.js";
import User from "../models/User.js";

const testUsers = [
  { name: "Test Ganesh", username: "seed_ganesh", dept: "Operation", role: "Operation", position: "Operations Executive" },
  { name: "Test Priya", username: "seed_priya", dept: "CRM", role: "CRM Executive", position: "CRM Executive" },
  { name: "Test Amit", username: "seed_amit", dept: "HR", role: "HR", position: "HR Executive" },
  { name: "Test Nisha", username: "seed_nisha", dept: "IT", role: "IT", position: "IT Support" },
  { name: "Test Rohan", username: "seed_rohan", dept: "Student", role: "Student", position: "Student" },
];

async function seed() {
  console.log("Connecting to Firestore...");
  await connectDatabase();

  console.log("\n--- Creating test users ---");
  for (const u of testUsers) {
    const hash = await bcrypt.hash("password123", 10);
    const created = await User.create({
      name: u.name,
      email: `${u.username}@test.local`,
      phone: "9876543210",
      emergencyContact: "9876543211",
      maritalStatus: "Single",
      education: "B.Tech",
      username: u.username,
      password: hash,
      dept: u.dept,
      position: u.position,
      role: u.role,
      joined: new Date().toISOString().slice(0, 10),
      state: "Rajasthan",
      branch: "Ajmer",
      branchCode: "AJ-01",
      address: "Seed script test address",
      status: "Active",
      type: "Current",
    });
    console.log(`Created ${u.username} -> path: ${created._ref.path}`);
  }

  console.log("\n--- Verifying structure directly in Firestore ---");
  const snapshot = await getFirestore().collectionGroup("members").get();
  const seededDocs = snapshot.docs.filter((doc) => doc.ref.path.startsWith("users/") && doc.data().username?.startsWith("seed_"));

  if (seededDocs.length === 0) {
    console.log("❌ No seeded docs found under users/<dept>/members/. Structure is NOT working.");
  } else {
    seededDocs.forEach((doc) => {
      console.log(`✅ ${doc.ref.path}  { dept: ${doc.data().dept}, name: ${doc.data().name} }`);
    });
  }

  console.log("\n--- Verifying User.find() (collectionGroup query) returns them ---");
  const found = await User.find({ username: { $in: testUsers.map((u) => u.username) } });
  console.log(`Found ${found.length} of ${testUsers.length} seeded users via User.find()`);

  console.log("\nDone. Check the Firestore console: users -> <dept> -> members -> <dept>_<number>");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed script failed:", err);
  process.exit(1);
});