import { iFixitService } from '../../services/ifixit.js';

/**
 * Node 3: Get Repair Guides
 * Fetches available guides for the device
 */
export async function getGuidesNode(state) {
  console.log('📚 Node 3: Fetching repair guides...');

  if (!state.devices || state.devices.length === 0) {
    console.log('⚠️ No device found, will use fallback');
    return {};
  }

  try {
    // Use the first matching device
    const device = state.devices[0];
    const guides = await iFixitService.getDeviceGuides(device.wiki_title || device.title);

    if (guides.length > 0) {
      console.log(`✅ Found ${guides.length} repair guide(s)`);
    } else {
      console.log('⚠️ No guides found for this device');
    }
    return { guides };
  } catch (error) {
    console.error('Guides fetch error:', error);
    return { error: error.message };
  }
}
