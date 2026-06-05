/**
 * Create test_erp schema and migrate all tables from erp schema
 * This creates a complete copy of the erp schema structure for testing
 */

import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function createTestErpSchema() {
    const client = await pool.connect();

    try {
        console.log('🚀 Starting test_erp schema creation and migration...\n');

        // 1. Create test_erp schema
        console.log('📁 Creating test_erp schema...');
        await client.query('CREATE SCHEMA IF NOT EXISTS test_erp');
        console.log('✅ Schema created\n');

        // 2. Get all tables from erp schema
        console.log('📋 Fetching all tables from erp schema...');
        const tablesResult = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'erp'
      ORDER BY tablename
    `);

        const tables = tablesResult.rows.map(row => row.tablename);
        console.log(`Found ${tables.length} tables to migrate:\n${tables.join(', ')}\n`);

        // 3. Drop existing test_erp tables if they exist
        console.log('🧹 Dropping existing test_erp tables...');
        for (const table of tables) {
            await client.query(`DROP TABLE IF EXISTS test_erp.${table} CASCADE`);
        }
        console.log('✅ Cleanup complete\n');

        // 4. Create tables in test_erp schema
        console.log('🏗️  Creating tables in test_erp schema...\n');

        for (const table of tables) {
            try {
                console.log(`   Creating test_erp.${table}...`);

                // Create table structure (without data)
                await client.query(`
          CREATE TABLE test_erp.${table} 
          (LIKE erp.${table} INCLUDING ALL)
        `);

                console.log(`   ✓ Created test_erp.${table}`);
            } catch (error) {
                console.error(`   ✗ Error creating ${table}:`, error.message);
            }
        }

        console.log('\n✅ All tables created in test_erp schema\n');

        // 5. Recreate foreign key constraints
        console.log('🔗 Recreating foreign key constraints...\n');

        const fkQuery = `
      SELECT
        tc.table_name,
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.update_rule,
        rc.delete_rule
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      LEFT JOIN information_schema.referential_constraints AS rc
        ON tc.constraint_name = rc.constraint_name
        AND tc.table_schema = rc.constraint_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'erp'
      ORDER BY tc.table_name, tc.constraint_name
    `;

        const fkResult = await client.query(fkQuery);

        for (const fk of fkResult.rows) {
            try {
                const alterSql = `
          ALTER TABLE test_erp.${fk.table_name}
          ADD CONSTRAINT ${fk.constraint_name}
          FOREIGN KEY (${fk.column_name})
          REFERENCES test_erp.${fk.foreign_table_name}(${fk.foreign_column_name})
          ON UPDATE ${fk.update_rule}
          ON DELETE ${fk.delete_rule}
        `;

                await client.query(alterSql);
                console.log(`   ✓ Added FK: ${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`);
            } catch (error) {
                // Some FKs might already exist from LIKE INCLUDING ALL
                if (!error.message.includes('already exists')) {
                    console.log(`   ⚠ Warning: Could not add FK on ${fk.table_name}: ${error.message}`);
                }
            }
        }

        console.log('\n✅ Foreign keys recreated\n');

        // 6. Optional: Copy data (commented out by default for safety)
        console.log('📊 Data migration options:');
        console.log('   - To copy data, uncomment the copyData() section in this script');
        console.log('   - Data is NOT copied by default to keep test environment clean\n');

        // Uncomment below to copy data
        // await copyData(client, tables);

        console.log('✨ Migration complete!\n');
        console.log('Summary:');
        console.log(`   • Schema: test_erp created`);
        console.log(`   • Tables: ${tables.length} tables migrated`);
        console.log(`   • Data: Not copied (empty tables for testing)`);
        console.log('\nYou can now use test_erp schema for testing without affecting production data.');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

/**
 * Copy data from erp to test_erp (optional)
 * Uncomment the call to this function if you want to copy data
 */
async function copyData(client, tables) {
    console.log('\n📦 Copying data from erp to test_erp...\n');

    for (const table of tables) {
        try {
            const result = await client.query(`
        INSERT INTO test_erp.${table}
        SELECT * FROM erp.${table}
      `);

            console.log(`   ✓ Copied ${result.rowCount} rows to test_erp.${table}`);
        } catch (error) {
            console.error(`   ✗ Error copying data to ${table}:`, error.message);
        }
    }

    console.log('\n✅ Data copy complete\n');
}

// Run the migration
createTestErpSchema()
    .then(() => {
        console.log('\n🎉 Test ERP schema is ready!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Failed to create test schema:', error);
        process.exit(1);
    });
