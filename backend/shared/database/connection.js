/**
 * PostgreSQL Database Connection
 * Uses connection pooling for better performance
 */

import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Prefer backend/configs/.env for local development, then fall back to other locations
const envPaths = [
  path.resolve(__dirname, '../../configs/.env'), // backend/configs/.env
  path.resolve(__dirname, '../../../configs/.env'), // project-root configs/.env
  path.resolve(__dirname, '../../.env'), // backend/.env
  path.resolve(__dirname, '../../../.env'), // project-root .env
];

for (const p of envPaths) {
  try {
    dotenv.config({ path: p });
    if (process.env.POSTGRES_HOST || process.env.DB_HOST) break;
  } catch (e) {
    // continue trying other paths
  }
}

const { Pool } = pg;

// Enhanced connection pool with retry logic
const createPool = () => {
  const config = {
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 10000, // Reduced from 30s to 10s for faster failures
    statement_timeout: 30000, // Statement timeout of 30s
    allowExitOnIdle: false, // Keep connection alive
    ssl: {
      rejectUnauthorized: false
    }
  };

  const dbUser = process.env.DB_USER || process.env.POSTGRES_USER;
  const dbPassword = process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD;
  const dbHost = process.env.DB_HOST || process.env.POSTGRES_HOST;
  const dbPort = process.env.DB_PORT || process.env.POSTGRES_PORT || '5432';
  const dbName = process.env.DB_NAME || process.env.POSTGRES_DB;

  if (dbUser && dbPassword && dbHost && dbName) {
    config.connectionString = `postgresql://${encodeURIComponent(dbUser)}:${encodeURIComponent(dbPassword)}@${dbHost}:${dbPort}/${dbName}`;
  } else if (process.env.DATABASE_URL) {
    config.connectionString = process.env.DATABASE_URL;
  }

  return new Pool(config);
};

const pool = createPool();

// Set default search path to ERP schema
const schema = process.env.DB_SCHEMA || 'erp';
pool.on('connect', async (client) => {
  await client.query(`SET search_path TO ${schema}, public`);
});

// Test connection
pool.on('error', (err) => {
  console.error('⚠️  Database connection error:', err.message);
  console.error('   The server will continue running, but database operations may fail.');
  // Don't exit - let the server continue running
  // Individual route handlers should handle database errors gracefully
});

// Test connection on startup (non-blocking)
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    console.error('   Server will continue, but database features may not work.');
    console.error('   Check your database configuration in .env file or connection.js');
  } else {
    console.log('✅ Database connected successfully');
  }
});

export default pool;

