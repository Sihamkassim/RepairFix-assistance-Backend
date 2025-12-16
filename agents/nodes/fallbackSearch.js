import { tavilyService } from '../../services/tavily.js';

/**
 * Node 6: Fallback Search (Tavily)
 * Used when iFixit doesn't have a guide
 */
export async function fallbackSearchNode(state) {
  console.log('🌐 Node 6: Performing fallback search...');

  try {
    // Ensure we have a valid query
    let query = state.userMessage;
    if (state.device && state.issue) {
      query = `${state.device} ${state.issue} repair guide`;
    }
    
    if (!query) {
      console.warn('⚠️ No query for fallback search');
      return { fallbackResults: null };
    }

    const results = await tavilyService.search(query);

    if (results.results && results.results.length > 0) {
      console.log(`✅ Found ${results.results.length} fallback result(s)`);
      return { fallbackResults: results };
    }
    
    console.log('⚠️ No fallback results found');
    return { fallbackResults: null };
  } catch (error) {
    // Don't fail the workflow if Tavily fails - just continue without fallback
    console.error('Fallback search error (continuing without):', error.message);
    return { fallbackResults: null };
  }
}
