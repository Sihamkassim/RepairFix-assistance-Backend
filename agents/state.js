import { Annotation } from '@langchain/langgraph';

/**
 * LangGraph State Definition using Annotation
 * Represents the shared state passed between all nodes
 */
export const AgentState = Annotation.Root({
  userId: Annotation(),
  conversationId: Annotation(),
  userMessage: Annotation(),
  device: Annotation(),
  issue: Annotation(),
  devices: Annotation(),
  guides: Annotation(),
  selectedGuide: Annotation(),
  guideDetails: Annotation(),
  fallbackResults: Annotation(),
  response: Annotation(),
  error: Annotation(),
  tokensUsed: Annotation(),
});
