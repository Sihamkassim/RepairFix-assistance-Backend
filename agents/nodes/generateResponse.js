import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { createGeminiModel, SYSTEM_PROMPTS } from '../../services/ai.js';
import { iFixitService } from '../../services/ifixit.js';
import { tavilyService } from '../../services/tavily.js';

/**
 * Node 7: Generate Response
 * Formats the final response using AI
 */
export async function generateResponseNode(state) {
  console.log('✍️ Node 7: Generating response...');

  try {
    const model = createGeminiModel(true);
    let context = '';

    if (state.guideDetails) {
      context = iFixitService.formatGuideAsMarkdown(state.guideDetails);
    } else if (state.fallbackResults && state.fallbackResults.results && state.fallbackResults.results.length > 0) {
      context = tavilyService.formatResults(state.fallbackResults, state.userMessage);
    } else {
      // Provide general repair advice when no specific guide is found
      context = `No specific repair guide was found for "${state.device || 'the device'}" regarding "${state.issue || 'this issue'}". 
      
Please provide general repair advice based on your knowledge. Include:
- Safety precautions
- Common causes of the issue
- General troubleshooting steps
- When to seek professional help
- Estimated difficulty level`;
    }

    const messages = [
      new SystemMessage(SYSTEM_PROMPTS.repairAssistant),
      new HumanMessage(`User's question: ${state.userMessage}\n\nRepair guide information:\n${context}\n\nProvide a helpful, formatted response.`),
    ];

    const response = await model.stream(messages);
    
    // For streaming, we'll handle this in the route
    console.log('✅ Response generated');
    return { response };
  } catch (error) {
    console.error('❌ Response generation error:', {
      message: error.message,
      name: error.name,
      code: error.code,
      status: error.status,
      stack: error.stack?.split('\n').slice(0, 3).join('\n')
    });
    
    // Provide a helpful fallback response when AI fails
    const fallbackResponse = `I'm having trouble generating a detailed response right now. 

For your question about **${state.device || 'your device'}** (${state.issue || 'repair issue'}):

**General Advice:**
1. ⚠️ **Safety First** - Always disconnect power before any repair
2. 🔍 **Research** - Check YouTube tutorials and forums for your specific model
3. 🛠️ **Tools** - Ensure you have the proper tools before starting
4. 📱 **iFixit** - Visit [iFixit.com](https://ifixit.com) directly for detailed guides

Please try again in a moment, or rephrase your question with more specific details about your device model.`;

    return { response: fallbackResponse };
  }
}
