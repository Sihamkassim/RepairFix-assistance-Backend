import dotenv from 'dotenv';
dotenv.config();

import { pool } from './config/db.js';

async function fixTrigger() {
  try {
    // Create new function for conversations
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_last_updated_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.last_updated = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('✅ Created update_last_updated_column function');

    // Drop old trigger
    await pool.query(`DROP TRIGGER IF EXISTS update_conversations_last_updated ON conversations;`);
    console.log('✅ Dropped old trigger');

    // Create new trigger
    await pool.query(`
      CREATE TRIGGER update_conversations_last_updated
      BEFORE UPDATE ON conversations
      FOR EACH ROW
      EXECUTE FUNCTION update_last_updated_column();
    `);
    console.log('✅ Created new trigger for conversations');

    console.log('✅ Database trigger fixed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing trigger:', error.message);
    process.exit(1);
  }
}

fixTrigger();
