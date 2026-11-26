/** Session helpers: who is signed in, and how to sign out. */

import { api } from './api.js';

let pending = null;

/** Cached GET /api/me, so the header and page share one request. */
export function loadSession({ force = false } = {}) {
  if (!pending || force) {
    pending = api('/me')
      .then((data) => (data ? data.user : null))
      .catch(() => null);
  }
  return pending;
}

export async function signOut() {
  try {
    await api('/auth/logout', { method: 'POST' });
  } catch {
    // Even if the request fails, forget the session locally.
  }

  pending = null;
  window.location.href = '/';
}
