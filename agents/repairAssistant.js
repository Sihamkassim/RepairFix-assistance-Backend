import { StateGraph, END } from '@langchain/langgraph';
import { AgentState } from './state.js';
import {
  identifyDeviceNode,
  searchIFixitNode,
  getGuidesNode,
  selectGuideNode,
  getGuideDetailsNode,
  fallbackSearchNode,
  generateResponseNode,
  saveToDBNode,
} from './nodes/index.js';
import { routeAfterGuides, routeAfterSelection } from './routing.js';

/**
 * Build the LangGraph workflow
 * Orchestrates all nodes and routing logic
 */
export function createRepairAssistantGraph() {
  try {
    // Pass AgentState directly to StateGraph constructor
    const workflow = new StateGraph(AgentState);

  // Add nodes
  workflow.addNode('identifyDevice', identifyDeviceNode);
  workflow.addNode('searchIFixit', searchIFixitNode);
  workflow.addNode('getGuides', getGuidesNode);
  workflow.addNode('selectGuide', selectGuideNode);
  workflow.addNode('getDetails', getGuideDetailsNode);
  workflow.addNode('fallback', fallbackSearchNode);
  workflow.addNode('generate', generateResponseNode);
  workflow.addNode('saveToDB', saveToDBNode);

  // Set entry point
  workflow.setEntryPoint('identifyDevice');

  // Define edges
  workflow.addEdge('identifyDevice', 'searchIFixit');
  workflow.addEdge('searchIFixit', 'getGuides');
  workflow.addConditionalEdges('getGuides', routeAfterGuides, {
    selectGuide: 'selectGuide',
    fallback: 'fallback',
  });
  workflow.addConditionalEdges('selectGuide', routeAfterSelection, {
    getDetails: 'getDetails',
    fallback: 'fallback',
  });
  workflow.addEdge('getDetails', 'generate');
  workflow.addEdge('fallback', 'generate');
  workflow.addEdge('generate', 'saveToDB');
  workflow.addEdge('saveToDB', END);

    return workflow.compile();
  } catch (error) {
    console.error('❌ Error creating workflow graph:', error);
    throw new Error(`Failed to create workflow: ${error.message}`);
  }
}
