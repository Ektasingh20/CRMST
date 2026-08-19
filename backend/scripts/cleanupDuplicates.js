import "dotenv/config";
import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;

async function main() {
  await mongoose.connect(uri);
  const services = await mongoose.connection.db.collection("services").find({}).toArray();
  console.log("Total services before cleanup:", services.length);

  const grouped = {};
  services.forEach((s) => {
    const key = `${s.category}-${s.name}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(s);
  });

  const toDelete = [];
  Object.values(grouped).forEach((items) => {
    if (items.length > 1) {
      items.sort((a, b) => {
        const da = a.createdAt ? new Date(a.createdAt) : new Date(0);
        const db = b.createdAt ? new Date(b.createdAt) : new Date(0);
        return da - db;
      });
      const keep = items[0];
      const duplicates = items.slice(1);
      duplicates.forEach((d) => toDelete.push(d._id));
      console.log(`Keeping ${keep.category} - ${keep.name} (_id: ${keep._id}), deleting ${duplicates.length} duplicates`);
    }
  });

  if (toDelete.length > 0) {
    const result = await mongoose.connection.db.collection("services").deleteMany({
      _id: { $in: toDelete },
    });
    console.log("Deleted records:", result.deletedCount);
  }

  const remaining = await mongoose.connection.db.collection("services").find({}).toArray();
  console.log("Total services after cleanup:", remaining.length);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
