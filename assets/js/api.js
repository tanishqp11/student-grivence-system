/**
 * Thin wrapper around fetch for the portal API.
 * Cookies are sent with every request, so the browser keeps the session.
 */

export async function api(path, options = {}) {
  const init = {
    method: options.method || 'GET',
    credentials: 'same-origin',
    headers: {},
  };

  if (options.body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(options.body);
  }

  let response;
  try {
    response = await fetch(`/api${path}`, init);
  } catch {
    throw new Error('Cannot reach the server. Check your connection and try again.');
  }

  const raw = await response.text();
  let data = null;
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const error = new Error((data && data.error) || `Request failed (${response.status}).`);
    error.status = response.status;
    throw error;
  }

  return data;
}
