import { tavily } from '@tavily/core';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const tavilyService = {
  /**
   * Fallback search when iFixit doesn't have the guide
   * @param {string} query - Search query
   * @returns {Promise<Object>} - Search results
   */
  async search(query) {
    const apiKey = process.env.TAVILY_API_KEY;
    
    console.log('🔑 Tavily API Key Check:', { exists: !!apiKey });

    if (!apiKey) {
      console.error('❌ TAVILY_API_KEY is missing');
      throw new Error('Tavily API Key is missing');
    }
    
    const tavilyClient = tavily({ apiKey });

    try {
      const response = await tavilyClient.search(query, {
        searchDepth: 'basic',
        maxResults: 5,
        includeImages: true,
      });

      return {
        results: response.results?.map(result => ({
          title: result.title,
          url: result.url,
          content: result.content,
          score: result.score,
        })) || [],
        images: response.images?.slice(0, 3) || [],
      };
    } catch (error) {
      console.error('Tavily search error:', error.message);
      return { results: [], images: [] };
    }
  },

  /**
   * Format Tavily results for the LLM
   * @param {Object} searchResults - Tavily search results
   * @param {string} query - Original query
   * @returns {string} - Formatted markdown
   */
  formatResults(searchResults, query) {
    if (!searchResults || !searchResults.results || searchResults.results.length === 0) {
      return `No specific repair guides found for "${query}". Please try rephrasing your question.`;
    }

    let markdown = `# Search Results for "${query}"\n\n`;
    markdown += `I couldn't find an official iFixit guide, but here are some relevant resources:\n\n`;

    searchResults.results.forEach((result, index) => {
      markdown += `## ${index + 1}. ${result.title}\n\n`;
      markdown += `${result.content}\n\n`;
      markdown += `[Read more](${result.url})\n\n`;
    });

    if (searchResults.images && searchResults.images.length > 0) {
      markdown += `## Related Images\n\n`;
      searchResults.images.forEach(img => {
        markdown += `![Related image](${img})\n\n`;
      });
    }

    return markdown;
  },
};
