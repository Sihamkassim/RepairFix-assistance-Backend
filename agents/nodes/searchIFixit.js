import { iFixitService } from '../../services/ifixit.js';

/**
 * Node 2: iFixit Device Search
 * Searches for the device on iFixit
 */
export async function searchIFixitNode(state) {
  console.log('🔎 Node 2: Searching iFixit for device...');

  if (!state.device) {
    return { error: 'No device identified' };
  }

  try {
    const devices = await iFixitService.searchDevices(state.device);

    if (devices.length > 0) {
      console.log(`✅ Found ${devices.length} device(s): ${devices[0].title}`);
    } else {
      console.log('⚠️ No devices found on iFixit');
    }
    return { devices };
  } catch (error) {
    console.error('iFixit search error:', error);
    return { error: error.message };
  }
}
