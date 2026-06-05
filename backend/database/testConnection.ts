import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT),
  connectionTimeoutMillis: 10000, // 10 seconds
});

async function testDB() {
  try {
    const client = await pool.connect();
    console.log("✅ DATABASE CONNECTED SUCCESSFULLY");
    client.release();
    process.exit(0);
  } catch (err) {
    console.error("❌ DATABASE CONNECTION FAILED");
    console.error(err);
    process.exit(1);
  }
}

testDB();
