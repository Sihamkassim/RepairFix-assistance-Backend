/**
 * Routing functions for conditional edges in the LangGraph workflow
 */

/**
 * Routes after fetching guides
 * Decides whether to select a guide or use fallback
 */
export function routeAfterGuides(state) {
  if (state.guides && state.guides.length > 0) {
    return 'selectGuide';
  }
  return 'fallback';
}

/**
 * Routes after guide selection
 * Decides whether to get guide details or use fallback
 */
export function routeAfterSelection(state) {
  if (state.selectedGuide) {
    return 'getDetails';
  }
  return 'fallback';
}
