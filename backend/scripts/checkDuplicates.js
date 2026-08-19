import "dotenv/config";
import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;

async function main() {
  await mongoose.connect(uri);
  const services = await mongoose.connection.db.collection("services").find({}).toArray();
  console.log("Total services:", services.length);

  const grouped = {};
  services.forEach((s) => {
    const key = `${s.category}-${s.name}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(s);
  });

  const duplicates = Object.entries(grouped).filter(([k, v]) => v.length > 1);
  console.log("Unique service keys:", Object.keys(grouped).length);
  console.log("Duplicate groups:", duplicates.length);

  duplicates.forEach(([key, items]) => {
    console.log(`${key}: ${items.length} copies`);
  });

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
