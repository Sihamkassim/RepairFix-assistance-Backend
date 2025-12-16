import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { createGeminiModel, SYSTEM_PROMPTS, parseJSON } from '../../services/ai.js';

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
    console.error('Guide selection error:', error);
    return { error: error.message };
  }
}
