import { iFixitService } from '../../services/ifixit.js';

/**
 * Node 5: Get Guide Details
 * Fetches complete repair instructions
 */
export async function getGuideDetailsNode(state) {
  console.log('📖 Node 5: Fetching guide details...');

  if (!state.selectedGuide) {
    console.log('⚠️ No guide selected');
    return {};
  }

  try {
    const details = await iFixitService.getGuideDetails(state.selectedGuide.guideid);

    if (details) {
      console.log(`✅ Retrieved guide: ${details.title}`);
      return { guideDetails: details };
    }
    return {};
  } catch (error) {
    console.error('Guide details error:', error);
    return { error: error.message };
  }
}
