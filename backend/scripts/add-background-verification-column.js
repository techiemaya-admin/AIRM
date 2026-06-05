// Migration script to add background_verification column to profiles table
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'airm',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'HPfm@1234',
});

async function addBackgroundVerificationColumn() {
  const client = await pool.connect();
  try {
    console.log('🔄 Adding background_verification column to profiles...');
    
    // Check if column already exists
    const checkResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'erp' 
        AND table_name = 'profiles' 
        AND column_name = 'background_verification'
    `);
    
    if (checkResult.rows.length > 0) {
      console.log('✅ Column background_verification already exists. No changes needed.');
      return;
    }
    
    // Add the column
    await client.query(`
      ALTER TABLE profiles 
      ADD COLUMN background_verification TEXT
    `);
    
    console.log('✅ Successfully added background_verification column to profiles');
    
  } catch (error) {
    console.error('❌ Error adding column:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addBackgroundVerificationColumn()
  .then(() => {
    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });
