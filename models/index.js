import { pool } from '../config/db.js';

// User Model
export const User = {
  // Create or update user (upsert)
  async createOrUpdate(userId, email, fullName = null) {
    const query = `
      INSERT INTO users (id, email, full_name)
      VALUES ($1, $2, $3)
      ON CONFLICT (id) 
      DO UPDATE SET email = $2, full_name = $3, updated_at = NOW()
      RETURNING *
    `;
    const result = await pool.query(query, [userId, email, fullName]);
    return result.rows[0];
  },

  // Get user by ID
  async findById(userId) {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await pool.query(query, [userId]);
    return result.rows[0];
  },

  // Get user by email
  async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await pool.query(query, [email]);
    return result.rows[0];
  }
};

// Conversation Model
export const Conversation = {
  // Create new conversation
  async create(userId, title = 'New Conversation') {
    const query = `
      INSERT INTO conversations (user_id, title)
      VALUES ($1, $2)
      RETURNING *
    `;
    const result = await pool.query(query, [userId, title]);
    return result.rows[0];
  },

  // Get conversation by ID
  async findById(conversationId) {
    const query = 'SELECT * FROM conversations WHERE id = $1';
    const result = await pool.query(query, [conversationId]);
    return result.rows[0];
  },

  // Get all conversations for a user
  async findByUserId(userId, limit = 50) {
    const query = `
      SELECT * FROM conversations 
      WHERE user_id = $1 
      ORDER BY last_updated DESC 
      LIMIT $2
    `;
    const result = await pool.query(query, [userId, limit]);
    return result.rows;
  },

  // Update conversation title
  async updateTitle(conversationId, title) {
    const query = `
      UPDATE conversations 
      SET title = $1, last_updated = NOW() 
      WHERE id = $2 
      RETURNING *
    `;
    const result = await pool.query(query, [title, conversationId]);
    return result.rows[0];
  },

  // Update last_updated timestamp
  async touch(conversationId) {
    const query = `
      UPDATE conversations 
      SET last_updated = NOW() 
      WHERE id = $1 
      RETURNING *
    `;
    const result = await pool.query(query, [conversationId]);
    return result.rows[0];
  },

  // Delete conversation
  async delete(conversationId) {
    const query = 'DELETE FROM conversations WHERE id = $1';
    await pool.query(query, [conversationId]);
  }
};

// Message Model
export const Message = {
  // Create new message
  async create(conversationId, role, content, metadata = {}) {
    const query = `
      INSERT INTO messages (conversation_id, role, content, metadata)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const result = await pool.query(query, [conversationId, role, content, JSON.stringify(metadata)]);
    
    // Update conversation's last_updated
    await Conversation.touch(conversationId);
    
    return result.rows[0];
  },

  // Get messages for a conversation
  async findByConversationId(conversationId, limit = 100) {
    const query = `
      SELECT * FROM messages 
      WHERE conversation_id = $1 
      ORDER BY created_at ASC 
      LIMIT $2
    `;
    const result = await pool.query(query, [conversationId, limit]);
    return result.rows;
  },

  // Get recent messages (for context)
  async getRecentMessages(conversationId, limit = 10) {
    const query = `
      SELECT * FROM messages 
      WHERE conversation_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2
    `;
    const result = await pool.query(query, [conversationId, limit]);
    return result.rows.reverse(); // Return in chronological order
  }
};

// Usage Model
export const Usage = {
  // Initialize usage for a user
  async initialize(userId) {
    const query = `
      INSERT INTO usage (user_id, total_tokens, total_conversations, total_messages)
      VALUES ($1, 0, 0, 0)
      ON CONFLICT (user_id) DO NOTHING
      RETURNING *
    `;
    const result = await pool.query(query, [userId]);
    return result.rows[0];
  },

  // Update token usage
  async incrementTokens(userId, tokensUsed) {
    const query = `
      UPDATE usage 
      SET total_tokens = total_tokens + $1, last_used = NOW() 
      WHERE user_id = $2 
      RETURNING *
    `;
    const result = await pool.query(query, [tokensUsed, userId]);
    return result.rows[0];
  },

  // Increment conversation count
  async incrementConversations(userId) {
    const query = `
      UPDATE usage 
      SET total_conversations = total_conversations + 1, last_used = NOW() 
      WHERE user_id = $1 
      RETURNING *
    `;
    const result = await pool.query(query, [userId]);
    return result.rows[0];
  },

  // Increment message count
  async incrementMessages(userId) {
    const query = `
      UPDATE usage 
      SET total_messages = total_messages + 1, last_used = NOW() 
      WHERE user_id = $1 
      RETURNING *
    `;
    const result = await pool.query(query, [userId]);
    return result.rows[0];
  },

  // Get usage stats for a user
  async findByUserId(userId) {
    const query = 'SELECT * FROM usage WHERE user_id = $1';
    const result = await pool.query(query, [userId]);
    return result.rows[0];
  }
};
