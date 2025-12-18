import { tavilyService } from '../../services/tavily.js';

/**
 * Node 6: Fallback Search (Tavily)
 * Used when iFixit doesn't have a guide
 */
export async function fallbackSearchNode(state) {
  console.log('🌐 Node 6: Performing fallback search...');

  try {
    // Ensure we have a valid query - be more specific for better image results
    let query = state.userMessage;
    if (state.device && state.issue) {
      query = `${state.device} ${state.issue} repair guide tutorial with images`;
    } else if (state.device) {
      query = `${state.device} repair guide tutorial with images`;
    }
    
    if (!query) {
      console.warn('⚠️ No query for fallback search');
      return { fallbackResults: null };
    }

    console.log('🔍 Fallback search query:', query);
    const results = await tavilyService.search(query);

    if (results.results && results.results.length > 0) {
      console.log(`✅ Found ${results.results.length} fallback result(s), ${results.images?.length || 0} images`);
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
