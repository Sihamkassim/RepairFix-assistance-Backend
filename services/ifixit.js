import axios from 'axios';

const IFIXIT_BASE_URL = 'https://www.ifixit.com/api/2.0';

export const iFixitService = {
  /**
   * Step 1: Search for devices matching the user's query
   * @param {string} query - Search term (e.g., "iPhone 13", "PS5")
   * @returns {Promise<Array>} - Array of device objects
   */
  async searchDevices(query) {
    try {
      const url = `${IFIXIT_BASE_URL}/search/${encodeURIComponent(query)}?filter=device`;
      const response = await axios.get(url);
      
      if (!response.data || !response.data.results) {
        return [];
      }

      // Extract relevant device info
      return response.data.results.map(device => ({
        title: device.title,
        wiki_title: device.wiki_title || device.title,
        url: device.url,
        image: device.image?.standard,
        category: device.category,
      }));
    } catch (error) {
      console.error('iFixit device search error:', error.message);
      return [];
    }
  },

  /**
   * Step 2: Get all available repair guides for a device
   * @param {string} deviceTitle - Device title from search (e.g., "PlayStation_5")
   * @returns {Promise<Array>} - Array of guide objects
   */
  async getDeviceGuides(deviceTitle) {
    try {
      const sanitizedTitle = deviceTitle.replace(/\s+/g, '_');
      const url = `${IFIXIT_BASE_URL}/wikis/CATEGORY/${encodeURIComponent(sanitizedTitle)}`;
      const response = await axios.get(url);

      if (!response.data || !response.data.guides) {
        return [];
      }

      // Extract relevant guide info
      return response.data.guides.map(guide => ({
        guideid: guide.guideid,
        title: guide.title,
        subject: guide.subject,
        difficulty: guide.difficulty,
        time_required: guide.time_required,
        url: guide.url,
        image: guide.image?.standard,
      }));
    } catch (error) {
      console.error('iFixit guides fetch error:', error.message);
      return [];
    }
  },

  /**
   * Step 3: Get detailed repair instructions for a specific guide
   * @param {number} guideId - Guide ID
   * @returns {Promise<Object>} - Detailed guide with steps
   */
  async getGuideDetails(guideId) {
    try {
      const url = `${IFIXIT_BASE_URL}/guides/${guideId}`;
      const response = await axios.get(url);

      if (!response.data) {
        return null;
      }

      const guide = response.data;

      // Clean and format the guide data
      return {
        guideid: guide.guideid,
        title: guide.title,
        introduction: guide.introduction_raw || guide.introduction,
        difficulty: guide.difficulty,
        time_required: guide.time_required,
        tools: guide.tools?.map(tool => tool.text || tool.title) || [],
        parts: guide.parts?.map(part => part.text || part.title) || [],
        steps: guide.steps?.map(step => ({
          title: step.title,
          lines: step.lines?.map(line => ({
            text: line.text_raw || line.text,
            level: line.level,
            bullet: line.bullet,
          })) || [],
          images: step.media?.map(media => ({
            url: media.standard || media.original,
            text: media.text,
          })) || [],
        })) || [],
        conclusion: guide.conclusion_raw || guide.conclusion,
        url: guide.url,
      };
    } catch (error) {
      console.error('iFixit guide details error:', error.message);
      return null;
    }
  },

  /**
   * Format guide into clean markdown for the LLM
   * @param {Object} guide - Guide details object
   * @returns {string} - Markdown formatted guide
   */
  formatGuideAsMarkdown(guide) {
    if (!guide) return '';

    let markdown = `# ${guide.title}\n\n`;
    
    if (guide.introduction) {
      markdown += `${guide.introduction}\n\n`;
    }

    markdown += `**Difficulty:** ${guide.difficulty || 'N/A'}\n`;
    markdown += `**Time Required:** ${guide.time_required || 'N/A'}\n\n`;

    if (guide.tools && guide.tools.length > 0) {
      markdown += `## Tools Needed\n`;
      guide.tools.forEach(tool => markdown += `- ${tool}\n`);
      markdown += `\n`;
    }

    if (guide.parts && guide.parts.length > 0) {
      markdown += `## Parts Needed\n`;
      guide.parts.forEach(part => markdown += `- ${part}\n`);
      markdown += `\n`;
    }

    if (guide.steps && guide.steps.length > 0) {
      markdown += `## Repair Steps\n\n`;
      guide.steps.forEach((step, index) => {
        markdown += `### Step ${index + 1}${step.title ? ': ' + step.title : ''}\n\n`;
        
        step.lines?.forEach(line => {
          const bullet = line.bullet === 'black' ? '•' : line.bullet === 'icon_note' ? '📝' : '';
          markdown += `${bullet} ${line.text}\n`;
        });

        if (step.images && step.images.length > 0) {
          step.images.forEach(img => {
            if (img.url) {
              markdown += `\n![${img.text || 'Step image'}](${img.url})\n`;
            }
          });
        }

        markdown += `\n`;
      });
    }

    if (guide.conclusion) {
      markdown += `## Conclusion\n\n${guide.conclusion}\n\n`;
    }

    markdown += `\n[View original guide on iFixit](${guide.url})\n`;

    return markdown;
  },
};
