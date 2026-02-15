const DEFAULT_API_BASE = import.meta.env.VITE_API_BASE || 'https://rapide-api.rapideph.workers.dev';

function resolveUrl(url) {
  if (!url || typeof url !== 'string') return url;
  if (/^(https?:\/\/|wss?:\/\/|file:\/\/)/i.test(url)) return url;
  if (url.startsWith('/api/')) return `${DEFAULT_API_BASE}${url}`;
  return url;
}

export async function fetchJson(url, options) {
  // Auto-inject auth headers from localStorage
  const mergedOptions = { ...options };
  const existingHeaders = mergedOptions.headers || {};
  const autoHeaders = {};
  
  try {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      if (user.admin_id != null) {
        autoHeaders['X-Admin-Id'] = String(user.admin_id);
      }
      if (user.role) {
        autoHeaders['X-User-Role'] = user.role;
      }
    }
  } catch {}

  mergedOptions.headers = { ...autoHeaders, ...existingHeaders };

  const response = await fetch(resolveUrl(url), mergedOptions);
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

// Helper to get auth headers for direct fetch() calls
export function getAuthHeaders() {
  const headers = {};
  try {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      if (user.admin_id != null) headers['X-Admin-Id'] = String(user.admin_id);
      if (user.role) headers['X-User-Role'] = user.role;
    }
  } catch {}
  return headers;
}
