import { Conversation, Message, Usage } from '../../models/index.js';

/**
 * Node 8: Save to Database
 * Saves conversation and updates usage
 */
export async function saveToDBNode(state) {
  console.log('💾 Node 8: Saving to database...', { 
    userId: state.userId, 
    conversationId: state.conversationId,
    hasResponse: !!state.response,
    device: state.device
  });

  if (!state.userId) {
    console.error('❌ Missing userId in state, cannot save to database');
    return { conversationId: null };
  }

  try {
    // Create or get conversation
    let conversationId = state.conversationId;
    
    if (!conversationId) {
      const title = state.device ? `${state.device} Repair` : 'General Repair';
      console.log('📝 Creating new conversation with title:', title);
      const conversation = await Conversation.create(state.userId, title);
      conversationId = conversation.id;
      console.log('✅ Created conversation with ID:', conversationId);
      await Usage.incrementConversations(state.userId);
    }

    // Save user message
    console.log('💬 Saving user message to conversation:', conversationId);
    await Message.create(conversationId, 'user', state.userMessage);
    await Usage.incrementMessages(state.userId);

    // Update token usage (approximate based on user message)
    const userTokens = Math.ceil(state.userMessage.length / 4);
    await Usage.incrementTokens(state.userId, userTokens);

    console.log('✅ Saved to database, returning conversationId:', conversationId);
    return { conversationId, tokensUsed: userTokens };
  } catch (error) {
    console.error('❌ Database save error:', error);
    // Return null conversationId if save fails, but don't crash the workflow
    return { conversationId: null, tokensUsed: 0 };
  }
}
