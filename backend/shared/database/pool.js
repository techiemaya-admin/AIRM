/**
 * PostgreSQL Database Connection Pool
 * Uses connection pooling for better performance
 */

import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from config directory (fallback to .env in backend if not found)
const envPath = path.resolve(__dirname, '../../../configs/.env');
dotenv.config({ path: envPath });
// Also try loading from backend directory as fallback
if (!process.env.POSTGRES_HOST && !process.env.DB_HOST) {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
}
// Also try loading from root directory as fallback (for backward compatibility)
if (!process.env.POSTGRES_HOST && !process.env.DB_HOST) {
  dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
}

const { Pool } = pg;

const pool = new Pool({
  host: process.env.POSTGRES_HOST || process.env.DB_HOST || '143.110.249.144',
  port: parseInt(process.env.POSTGRES_PORT || process.env.DB_PORT || '5432'),
  database: process.env.POSTGRES_DB || process.env.DB_NAME || 'airm',
  user: process.env.POSTGRES_USER || process.env.DB_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD || 'postgres',
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection could not be established
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Test connection on startup
pool.query('SELECT NOW()')
  .then(() => {
    console.log('✅ Database connection pool established');
  })
  .catch((err) => {
    console.error('❌ Database connection pool failed:', err);
  });

export default pool;

