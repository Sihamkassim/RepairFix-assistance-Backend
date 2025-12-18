import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { createGeminiModel, SYSTEM_PROMPTS, parseJSON } from '../../services/ai.js';

/**
 * Helper function to delay execution
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Node 1: Device Identification
 * Analyzes user message to identify device and issue
 */
export async function identifyDeviceNode(state) {
  console.log('🔍 Node 1: Identifying device...', { 
    userId: state.userId, 
    message: state.userMessage,
    stateKeys: Object.keys(state)
  });
  
  const MAX_RETRIES = 3;
  const INITIAL_DELAY = 2000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const model = createGeminiModel(false);
      const messages = [
        new SystemMessage(SYSTEM_PROMPTS.deviceIdentifier),
        new HumanMessage(state.userMessage),
      ];

      const response = await model.invoke(messages);
      const parsed = parseJSON(response.content);

      if (parsed && parsed.device) {
        console.log(`✅ Identified: ${parsed.device} - ${parsed.issue}`);
        return { device: parsed.device, issue: parsed.issue };
      } else {
        return { error: 'Could not identify device from your message' };
      }
    } catch (error) {
      const isRateLimitError = error.message?.includes('429') || 
                               error.status === 429 || 
                               error.message?.includes('Too Many Requests');
      
      console.error(`Device identification error (attempt ${attempt}/${MAX_RETRIES}):`, error.message);
      
      if (isRateLimitError && attempt < MAX_RETRIES) {
        const waitTime = INITIAL_DELAY * Math.pow(2, attempt - 1);
        console.log(`⏳ Rate limited. Waiting ${waitTime}ms before retry...`);
        await delay(waitTime);
        continue;
      }
      
      return { error: error.message };
    }
  }
  
  return { error: 'Failed to identify device after multiple attempts' };
}
