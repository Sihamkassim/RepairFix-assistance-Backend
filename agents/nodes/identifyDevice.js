import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { createGeminiModel, SYSTEM_PROMPTS, parseJSON } from '../../services/ai.js';

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
    console.error('Device identification error:', error);
    return { error: error.message };
  }
}
