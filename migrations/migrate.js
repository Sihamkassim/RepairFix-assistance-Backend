import { pool } from '../config/db.js';

export const runMigrations = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Running database migrations...');
    
    await client.query('BEGIN');
    
    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        full_name TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Create conversations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT DEFAULT 'New Conversation',
        started_at TIMESTAMP DEFAULT NOW(),
        last_updated TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Create messages table
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
        content TEXT NOT NULL,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Create usage table
    await client.query(`
      CREATE TABLE IF NOT EXISTS usage (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        total_tokens INTEGER DEFAULT 0,
        total_conversations INTEGER DEFAULT 0,
        total_messages INTEGER DEFAULT 0,
        last_used TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_conversations_last_updated ON conversations(last_updated DESC)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC)
    `);
    
    // Create update trigger functions
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await client.query(`
      CREATE OR REPLACE FUNCTION update_last_updated_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.last_updated = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    
    // Create triggers
    await client.query(`
      DROP TRIGGER IF EXISTS update_users_updated_at ON users;
      CREATE TRIGGER update_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
    `);
    
    await client.query(`
      DROP TRIGGER IF EXISTS update_conversations_last_updated ON conversations;
      CREATE TRIGGER update_conversations_last_updated
        BEFORE UPDATE ON conversations
        FOR EACH ROW
        EXECUTE FUNCTION update_last_updated_column()
    `);
    
    await client.query('COMMIT');
    console.log('✅ Database migrations completed successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
};
