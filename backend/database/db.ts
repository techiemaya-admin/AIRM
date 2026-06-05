import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

export const db = new pg.Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT),
  connectionTimeoutMillis: 10000, // 10 seconds
});
