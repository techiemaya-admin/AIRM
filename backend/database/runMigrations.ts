import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { db } from "./db.js";

async function runMigrations() {
  console.log("Starting migrations...");

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const migrationDir = path.join(__dirname, "migrations");

  if (!fs.existsSync(migrationDir)) {
    console.error("Migrations directory not found:", migrationDir);
    process.exit(1);
  }

  const files = fs
    .readdirSync(migrationDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  try {
    console.log("Testing database connection...");
    const client = await db.connect();
    client.release();
    console.log("Database connection OK — running migrations");
  } catch (err: any) {
    console.error("Database connection failed:", err?.message || err);
    process.exit(1);
  }

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationDir, file), "utf8");
    console.log(`Running migration: ${file}`);
    try {
      await db.query(sql);
    } catch (err: any) {
      console.error(`Error running ${file}:`, err?.message || err);
      process.exit(1);
    }
  }

  console.log("All migrations complete");
  process.exit(0);
}

runMigrations();
