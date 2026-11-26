/**
 * Shared front-end module.
 *
 * Page scripts import everything from this file, while the code itself lives in
 * small modules: api (requests), session (sign in state), format (labels and
 * HTML fragments), icons, ui (toasts) and chrome (header and footer).
 */

export { api } from './api.js';
export { loadSession, signOut } from './session.js';
export { mountChrome } from './chrome.js';
export {
  CATEGORY_LABELS,
  STATUS_META,
  PRIORITY_META,
  escapeHtml,
  formatDate,
  categoryLabel,
  priorityLabel,
  statusPill,
  priorityBadge,
  timelineHtml,
} from './format.js';
export { toast, copyText } from './ui.js';
export { ICON } from './icons.js';
