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
      // Try multiple search variations for better results
      const searchQueries = [
        query,
        query.replace(/\s+/g, ' ').trim(), // Clean up whitespace
      ];
      
      // Add common variations
      if (query.toLowerCase().includes('ps5')) {
        searchQueries.push('PlayStation 5');
      }
      if (query.toLowerCase().includes('playstation 5')) {
        searchQueries.push('PS5');
      }

      let allDevices = [];
      
      for (const searchQuery of searchQueries) {
        const url = `${IFIXIT_BASE_URL}/search/${encodeURIComponent(searchQuery)}?filter=device`;
        console.log('🔍 iFixit search URL:', url);
        
        const response = await axios.get(url);
        
        if (response.data?.results) {
          const devices = response.data.results.map(device => ({
            title: device.title,
            wiki_title: device.wiki_title || device.title,
            url: device.url,
            image: device.image?.standard || device.image?.medium,
            category: device.category,
          }));
          allDevices.push(...devices);
        }
      }

      // Remove duplicates by wiki_title
      const uniqueDevices = allDevices.filter((device, index, self) =>
        index === self.findIndex(d => d.wiki_title === device.wiki_title)
      );

      console.log(`📱 iFixit found ${uniqueDevices.length} unique device(s)`);
      return uniqueDevices;
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
        // Main guide image
        image: guide.image?.standard || guide.image?.medium || guide.image?.original || null,
        tools: guide.tools?.map(tool => ({
          text: tool.text || tool.title,
          thumbnail: tool.thumbnail || null,
          url: tool.url || null,
        })) || [],
        parts: guide.parts?.map(part => ({
          text: part.text || part.title,
          thumbnail: part.thumbnail || null,
          url: part.url || null,
        })) || [],
        steps: guide.steps?.map(step => ({
          title: step.title,
          lines: step.lines?.map(line => ({
            text: line.text_raw || line.text,
            level: line.level,
            bullet: line.bullet,
          })) || [],
          // iFixit API returns media as { type: "image", data: [...] } object
          // Extract images from media.data array
          images: (() => {
            // Handle different media structures
            if (!step.media) return [];
            
            // If media is an object with data array (new API structure)
            if (step.media.data && Array.isArray(step.media.data)) {
              return step.media.data.map(img => ({
                url: img.standard || img.large || img.medium || img.original || img.huge,
                thumbnail: img.thumbnail || img.mini,
                alt: img.text || 'Step image',
              }));
            }
            
            // If media is an array directly (old API structure)
            if (Array.isArray(step.media)) {
              return step.media.filter(m => m.type === 'image' || !m.type).map(img => ({
                url: img.standard || img.large || img.medium || img.original,
                thumbnail: img.thumbnail || img.mini,
                alt: img.text || 'Step image',
              }));
            }
            
            return [];
          })(),
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
    
    // Add main guide image if available
    if (guide.image) {
      markdown += `![${guide.title}](${guide.image})\n\n`;
    }
    
    if (guide.introduction) {
      markdown += `${guide.introduction}\n\n`;
    }

    markdown += `**Difficulty:** ${guide.difficulty || 'N/A'}\n`;
    markdown += `**Time Required:** ${guide.time_required || 'N/A'}\n\n`;

    if (guide.tools && guide.tools.length > 0) {
      markdown += `## 🛠️ Tools Needed\n\n`;
      guide.tools.forEach(tool => {
        const toolText = typeof tool === 'string' ? tool : tool.text;
        const toolThumb = typeof tool === 'object' ? tool.thumbnail : null;
        if (toolThumb) {
          markdown += `- ![](${toolThumb}) ${toolText}\n`;
        } else {
          markdown += `- ${toolText}\n`;
        }
      });
      markdown += `\n`;
    }

    if (guide.parts && guide.parts.length > 0) {
      markdown += `## 📦 Parts Needed\n\n`;
      guide.parts.forEach(part => {
        const partText = typeof part === 'string' ? part : part.text;
        const partThumb = typeof part === 'object' ? part.thumbnail : null;
        if (partThumb) {
          markdown += `- ![](${partThumb}) ${partText}\n`;
        } else {
          markdown += `- ${partText}\n`;
        }
      });
      markdown += `\n`;
    }

    if (guide.steps && guide.steps.length > 0) {
      markdown += `## 📋 Repair Steps\n\n`;
      guide.steps.forEach((step, index) => {
        markdown += `### Step ${index + 1}${step.title ? ': ' + step.title : ''}\n\n`;
        
        // Add step images first for visual context
        if (step.images && step.images.length > 0) {
          step.images.forEach(img => {
            if (img.url) {
              markdown += `![${img.alt || 'Step ' + (index + 1) + ' image'}](${img.url})\n\n`;
            }
          });
        }
        
        // Then add the instructions
        step.lines?.forEach(line => {
          const bullet = line.bullet === 'black' ? '•' : 
                        line.bullet === 'icon_note' ? '📝' : 
                        line.bullet === 'icon_caution' ? '⚠️' :
                        line.bullet === 'icon_reminder' ? '💡' : '•';
          markdown += `${bullet} ${line.text}\n`;
        });

        markdown += `\n`;
      });
    }

    if (guide.conclusion) {
      markdown += `## ✅ Conclusion\n\n${guide.conclusion}\n\n`;
    }

    markdown += `\n---\n📱 [View original guide on iFixit](${guide.url})\n`;

    return markdown;
  },
};
