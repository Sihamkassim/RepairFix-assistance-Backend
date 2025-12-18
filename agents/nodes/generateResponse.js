import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { createGeminiModel, SYSTEM_PROMPTS } from '../../services/ai.js';
import { iFixitService } from '../../services/ifixit.js';
import { tavilyService } from '../../services/tavily.js';

/**
 * Helper function to delay execution
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Node 7: Generate Response
 * Formats the final response using AI with retry logic for rate limits
 */
export async function generateResponseNode(state) {
  console.log('✍️ Node 7: Generating response...');

  const MAX_RETRIES = 3;
  const INITIAL_DELAY = 2000; // 2 seconds

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
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
      new HumanMessage(`User's question: ${state.userMessage}

## Repair Guide Information:
${context}

## Instructions:
Provide a helpful, formatted response based on the repair guide above.
IMPORTANT: Include ALL images from the guide in your response using the exact markdown syntax: ![alt](url)
Place each image near the relevant step it illustrates. Do not skip any images.`),
    ];

      const response = await model.stream(messages);
      
      // For streaming, we'll handle this in the route
      console.log('✅ Response generated on attempt', attempt);
      return { response };
    } catch (error) {
      const isRateLimitError = error.message?.includes('429') || 
                               error.status === 429 || 
                               error.message?.includes('Too Many Requests') ||
                               error.message?.includes('quota');
      
      console.error(`❌ Response generation error (attempt ${attempt}/${MAX_RETRIES}):`, {
        message: error.message,
        name: error.name,
        code: error.code,
        status: error.status,
        isRateLimitError,
        stack: error.stack?.split('\n').slice(0, 3).join('\n')
      });

      // If it's a rate limit error and we have retries left, wait and retry
      if (isRateLimitError && attempt < MAX_RETRIES) {
        const waitTime = INITIAL_DELAY * Math.pow(2, attempt - 1); // Exponential backoff
        console.log(`⏳ Rate limited. Waiting ${waitTime}ms before retry ${attempt + 1}...`);
        await delay(waitTime);
        continue;
      }

      // If we've exhausted retries or it's not a rate limit error, provide fallback
      if (attempt === MAX_RETRIES || !isRateLimitError) {
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
  }
}
