/**
 * Add LOP and base salary fields to payslips table
 */

import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function addPayslipLopFields() {
    const client = await pool.connect();

    try {
        console.log('Adding LOP and base salary fields to payslips table...');

        await client.query('BEGIN');

        // Add base_salary column (editable base salary)
        await client.query(`
      ALTER TABLE payslips 
      ADD COLUMN IF NOT EXISTS base_salary DECIMAL(10,2) DEFAULT 0
    `);
        console.log('✓ Added base_salary column');

        // Add lop_days column (number of LOP days)
        await client.query(`
      ALTER TABLE payslips 
      ADD COLUMN IF NOT EXISTS lop_days DECIMAL(5,2) DEFAULT 0
    `);
        console.log('✓ Added lop_days column');

        // Add lop_deduction column (amount deducted for LOP)
        await client.query(`
      ALTER TABLE payslips 
      ADD COLUMN IF NOT EXISTS lop_deduction DECIMAL(10,2) DEFAULT 0
    `);
        console.log('✓ Added lop_deduction column');

        // Add paid_days column (number of paid working days)
        await client.query(`
      ALTER TABLE payslips 
      ADD COLUMN IF NOT EXISTS paid_days DECIMAL(5,2) DEFAULT 0
    `);
        console.log('✓ Added paid_days column');

        // Add attendance_summary JSONB column (detailed breakdown)
        await client.query(`
      ALTER TABLE payslips 
      ADD COLUMN IF NOT EXISTS attendance_summary JSONB DEFAULT '{}'::jsonb
    `);
        console.log('✓ Added attendance_summary column');

        await client.query('COMMIT');

        console.log('\n✅ Successfully added all LOP and base salary fields to payslips table');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error adding fields:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

addPayslipLopFields()
    .then(() => {
        console.log('\n🎉 Migration completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Migration failed:', error);
        process.exit(1);
    });
