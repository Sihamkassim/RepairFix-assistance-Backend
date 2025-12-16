import { User, Usage, Conversation, Message } from '../models/index.js';

// Get user profile
export const getUserProfile = async (req, res) => {
  try {
    const user = req.user;
    const usage = await Usage.findByUserId(user.id);
    
    res.json({ 
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        createdAt: user.created_at
      },
      usage: usage || {
        total_tokens: 0,
        total_conversations: 0,
        total_messages: 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get user's conversations
export const getUserConversations = async (req, res) => {
  try {
    const userId = req.userId;
    const conversations = await Conversation.findByUserId(userId);
    
    res.json({ conversations });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get user usage statistics
export const getUserUsage = async (req, res) => {
  try {
    const userId = req.userId;
    const usage = await Usage.findByUserId(userId);
    
    res.json({ 
      usage: usage || {
        total_tokens: 0,
        total_conversations: 0,
        total_messages: 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
