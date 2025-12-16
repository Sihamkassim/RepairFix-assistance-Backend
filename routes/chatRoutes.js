import express from 'express';
import { protect, getAuthUser } from '../middleware/auth.js';
import { createRepairAssistantGraph } from '../agents/repairAssistant.js';
import { AgentState } from '../agents/state.js';
import { Conversation, Message, Usage } from '../models/index.js';

const router = express.Router();

// All routes require authentication
router.use(protect, getAuthUser);

/**
 * SSE Streaming endpoint for chat
 * GET /api/chat/stream?message=...&conversationId=...
 */
router.get('/stream', async (req, res) => {
  const { message, conversationId } = req.query;
  const userId = req.userId;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  let finalState = null;
  let fullResponseText = '';
  // Track the conversation id as soon as we see it in the stream so we can
  // persist the assistant message even if the final state merge misses it.
  let resolvedConversationId = conversationId ? parseInt(conversationId) : null;

  try {
    // Initialize agent state
    console.log('🚀 Starting workflow for user:', userId, 'message:', message.substring(0, 50) + '...');
    
    const initialState = {
      userId,
      conversationId: conversationId ? parseInt(conversationId) : null,
      userMessage: message,
    };

    // Create and run the graph
    const graph = createRepairAssistantGraph();
    
    // Send status updates
    res.write(`data: ${JSON.stringify({ type: 'status', message: 'Analyzing your question...' })}\n\n`);

    try {
      // Run the workflow with streaming for live updates
      const stream = await graph.stream(initialState);
      
      finalState = { ...initialState };
      
      // Process stream with timeout check (120 seconds)
      const startTime = Date.now();
      const TIMEOUT_MS = 120000;
      
      for await (const chunk of stream) {
        if (Date.now() - startTime > TIMEOUT_MS) {
          throw new Error('Workflow timeout after 120 seconds');
        }

        const nodeName = Object.keys(chunk)[0];
        const updates = chunk[nodeName];
        
        console.log(`📦 Node completed: ${nodeName}`, { 
          updatedKeys: Object.keys(updates || {}),
          conversationIdInUpdate: updates?.conversationId
        });
        
        // Update final state
        finalState = { ...finalState, ...updates };

        // Persist conversation id early so we can use it when saving the assistant reply
        if (updates?.conversationId) {
          resolvedConversationId = updates.conversationId;
          console.log('🔑 Captured conversationId:', resolvedConversationId);
        }
        
        // Send progress updates based on completed nodes
        const statusMessages = {
          identifyDevice: 'Device identified. Searching for guides...',
          searchIFixit: 'Search completed. Checking availability...',
          getGuides: 'Guides found. Selecting the best one...',
          selectGuide: 'Guide selected. Reading details...',
          getDetails: 'Reading guide details...',
          fallback: 'Searching alternative sources...',
          generate: 'Drafting response...',
          saveToDB: 'Saving conversation...'
        };

        if (statusMessages[nodeName]) {
          res.write(`data: ${JSON.stringify({ type: 'status', message: statusMessages[nodeName] })}\n\n`);
        }
      }

    } catch (workflowError) {
      console.error('❌ Workflow execution error:', workflowError);
      throw new Error(`Workflow failed: ${workflowError.message}`);
    }

    if (!finalState || typeof finalState !== 'object') {
      console.error('❌ Invalid final state:', finalState);
      throw new Error('Workflow did not return a valid state');
    }

    console.log('✅ Workflow completed. State keys:', Object.keys(finalState));

    // Handle response streaming with comprehensive error handling
    try {
      if (finalState.response && typeof finalState.response === 'object') {
        res.write(`data: ${JSON.stringify({ type: 'status', message: 'Generating response...' })}\n\n`);
        
        let chunkCount = 0;
        for await (const chunk of finalState.response) {
          chunkCount++;
          const content = typeof chunk === 'string' ? chunk : (chunk.content || '');
          if (content) {
            fullResponseText += content;
            res.write(`data: ${JSON.stringify({ type: 'token', content })}\n\n`);
          }
        }
        console.log(`✅ Streamed ${chunkCount} chunks, total length: ${fullResponseText.length}`);
      } else if (typeof finalState.response === 'string') {
        fullResponseText = finalState.response;
        res.write(`data: ${JSON.stringify({ type: 'token', content: finalState.response })}\n\n`);
        console.log('✅ Sent string response, length:', fullResponseText.length);
      } else {
        console.warn('⚠️ No valid response in finalState:', finalState.response);
        const fallback = 'I could not generate a response for that question. Please try rephrasing or be more specific about your device and issue.';
        fullResponseText = fallback;
        res.write(`data: ${JSON.stringify({ type: 'token', content: fallback })}\n\n`);
      }
    } catch (streamError) {
      console.error('❌ Streaming error:', streamError);
      const errorMsg = 'An error occurred while generating the response. Please try again.';
      fullResponseText = errorMsg;
      res.write(`data: ${JSON.stringify({ type: 'token', content: errorMsg })}\n\n`);
    }

    // Save assistant message to DB
    console.log('📝 Saving assistant message...', { 
      resolvedConversationId,
      finalStateConversationId: finalState.conversationId, 
      responseLength: fullResponseText?.length 
    });
    
    const conversationIdToSave = resolvedConversationId || finalState.conversationId || null;
    console.log('🔑 Final conversationIdToSave:', conversationIdToSave);

    if (conversationIdToSave && fullResponseText) {
      try {
        await Message.create(conversationIdToSave, 'assistant', fullResponseText);
        await Usage.incrementMessages(userId);
        await Conversation.touch(conversationIdToSave);
        console.log('✅ Saved assistant message to database');
      } catch (dbError) {
        console.error('❌ Database save error:', dbError);
        // Don't fail the request if DB save fails
      }
    } else {
      console.warn('⚠️ Could not save assistant message:', { 
        hasConversationId: !!finalState.conversationId, 
        hasResponse: !!fullResponseText 
      });
    }

    // Send completion
    res.write(`data: ${JSON.stringify({ 
      type: 'done', 
      conversationId: conversationIdToSave,
      tokensUsed: finalState.tokensUsed || 0
    })}\n\n`);

    res.end();
  } catch (error) {
    console.error('❌ Fatal stream error:', {
      message: error.message,
      stack: error.stack,
      userId,
      conversationId,
      finalStateExists: !!finalState
    });

    // Send user-friendly error message
    const userMessage = error.message?.includes('timeout') 
      ? 'The request took too long. Please try again with a simpler question.'
      : error.message?.includes('API') || error.message?.includes('fetch')
      ? 'Unable to connect to external services. Please check your internet connection and try again.'
      : error.message?.includes('database') || error.message?.includes('DB')
      ? 'Database error. Your message was processed but may not be saved.'
      : 'An unexpected error occurred. Please try again or contact support if the issue persists.';

    res.write(`data: ${JSON.stringify({ 
      type: 'error', 
      message: userMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })}\n\n`);
    res.end();
  }
});

/**
 * Create a new conversation
 * POST /api/chat/conversations
 */
router.post('/conversations', async (req, res) => {
  try {
    const { title } = req.body;
    const userId = req.userId;

    const conversation = await Conversation.create(userId, title || 'New Conversation');
    await Usage.incrementConversations(userId);

    res.json({ conversation });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get conversation history
 * GET /api/chat/conversations/:id
 */
router.get('/conversations/:id', async (req, res) => {
  try {
    const conversationId = parseInt(req.params.id);
    const conversation = await Conversation.findById(conversationId);

    if (!conversation || conversation.user_id !== req.userId) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const messages = await Message.findByConversationId(conversationId);

    res.json({ conversation, messages });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Delete a conversation
 * DELETE /api/chat/conversations/:id
 */
router.delete('/conversations/:id', async (req, res) => {
  try {
    const conversationId = parseInt(req.params.id);
    const conversation = await Conversation.findById(conversationId);

    if (!conversation || conversation.user_id !== req.userId) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    await Conversation.delete(conversationId);

    res.json({ message: 'Conversation deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
