const DEFAULT_API_BASE = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_BASE)
  ? process.env.REACT_APP_API_BASE
  : 'http://localhost:5000';

function resolveUrl(url) {
  if (!url || typeof url !== 'string') return url;
  if (/^(https?:\/\/|wss?:\/\/|file:\/\/)/i.test(url)) return url;
  if (url.startsWith('/api/')) return `${DEFAULT_API_BASE}${url}`;
  return url;
}

export async function fetchJson(url, options) {
  const response = await fetch(resolveUrl(url), options);
  const text = await response.text();

  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: text || response.statusText };
  }

  if (!response.ok) {
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      return { ...data, success: false, http_status: response.status };
    }
    return { success: false, error: text || response.statusText, http_status: response.status };
  }

  if (data && typeof data === 'object' && !Array.isArray(data)) {
    if (data.status === 'success' && data.success === undefined) {
      return { ...data, success: true };
    }
    if (data.status === 'error' && data.success === undefined) {
      return { ...data, success: false, error: data.error || data.message || 'Request failed' };
    }
  }

  return data;
}
