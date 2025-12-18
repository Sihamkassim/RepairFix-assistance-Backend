import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { createGeminiModel, SYSTEM_PROMPTS, parseJSON } from '../../services/ai.js';

/**
 * Helper function to delay execution
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Node 4: Select Best Guide
 * Uses AI to select the most relevant guide
 */
export async function selectGuideNode(state) {
  console.log('🎯 Node 4: Selecting best guide...');

  if (!state.guides || state.guides.length === 0) {
    console.log('⚠️ No guides to select from');
    return {};
  }

  const MAX_RETRIES = 3;
  const INITIAL_DELAY = 2000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const guidesInfo = state.guides.map(g => ({
        guideid: g.guideid,
        title: g.title,
        subject: g.subject,
        difficulty: g.difficulty,
      }));

      const model = createGeminiModel(false);
      const messages = [
        new SystemMessage(SYSTEM_PROMPTS.guideSelector),
        new HumanMessage(`User's issue: ${state.issue}\n\nAvailable guides:\n${JSON.stringify(guidesInfo, null, 2)}`),
      ];

      const response = await model.invoke(messages);
      const parsed = parseJSON(response.content);

      if (parsed && parsed.guideid) {
        const selectedGuide = state.guides.find(g => g.guideid === parsed.guideid);
        console.log(`✅ Selected guide: ${selectedGuide?.title}`);
        return { selectedGuide };
      } else {
        console.log('⚠️ Could not select a guide, will use fallback');
        return {};
      }
    } catch (error) {
      const isRateLimitError = error.message?.includes('429') || 
                               error.status === 429 || 
                               error.message?.includes('Too Many Requests');
      
      console.error(`Guide selection error (attempt ${attempt}/${MAX_RETRIES}):`, error.message);
      
      if (isRateLimitError && attempt < MAX_RETRIES) {
        const waitTime = INITIAL_DELAY * Math.pow(2, attempt - 1);
        console.log(`⏳ Rate limited. Waiting ${waitTime}ms before retry...`);
        await delay(waitTime);
        continue;
      }
      
      return { error: error.message };
    }
  }
  
  return { error: 'Failed to select guide after multiple attempts' };
}
