import jwt from 'jsonwebtoken';
import pool from '../shared/database/connection.js';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(new URL(import.meta.url).pathname, '../../configs/.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

async function main() {
  try {
    const res = await pool.query('SELECT id, email FROM erp.users LIMIT 1');
    if (res.rows.length === 0) {
      console.error('No users found in erp.users');
      process.exit(1);
    }
    const user = res.rows[0];
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    console.log('USER:', user);
    console.log('TOKEN:', token);
    process.exit(0);
  } catch (err) {
    console.error('Error generating token:', err);
    process.exit(1);
  }
}

main();
